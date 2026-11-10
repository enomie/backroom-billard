/**
 * The connection to the others (SpacetimeDB on Maincloud): the guest joins the room with his name,
 * country and face after the welcome screen, sends a sign of life and where his camera is, and sees the
 * faces of the others at the places of their free cameras. Only used in multiplayer (the welcome screen
 * asks): single player has no connection at all. See _docs/multiplayer.md.
 */
import * as THREE from "three";
import { DbConnection, tables } from "./module_bindings/index.ts";
import { createFaceBall } from "./face-ball.js";
import { isFace } from "./face.js";
import { displayName } from "./name-rules.js";
import { DEFAULT_COUNTRY } from "./country-list.js";
import {
  MULTIPLAYER_URI,
  MULTIPLAYER_DATABASE,
  MULTIPLAYER_TOKEN_KEY,
  MULTIPLAYER_HEARTBEAT_SECONDS,
  MULTIPLAYER_PRESENCE_SECONDS,
  MULTIPLAYER_FACE_FOLLOW,
  MULTIPLAYER_JOIN_SECONDS,
} from "./multiplayer-constants.js";

const loadToken = () => {
  try {
    return localStorage.getItem(MULTIPLAYER_TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};
const saveToken = (token) => {
  try {
    localStorage.setItem(MULTIPLAYER_TOKEN_KEY, token);
  } catch {
    /* not allowed: the guest is a new one next time */
  }
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const euler = new THREE.Euler();

/** @param {THREE.Scene} scene */
export function createMultiplayer(scene) {
  let connection = null;
  let myId = ""; // the identity of this guest (hex)
  let joined = false;
  const faces = new Map(); // identity (hex) → { ball, pose: { x, y, z, yaw, pitch } | null, free, connected }
  let heartbeatAge = 0;
  let presenceAge = 0;
  let sentFree = null; // what the database knows about the free camera of this guest

  let ready = null; // { resolve, reject, timer } while joining
  const hex = (identity) => identity.toHexString();
  const finishJoin = (error) => {
    if (!ready) return;
    window.clearTimeout(ready.timer);
    const { resolve, reject } = ready;
    ready = null;
    if (error) {
      // it did not work: close what was opened, so that a new try starts from scratch
      try {
        connection?.disconnect();
      } catch {
        /* nothing to close */
      }
      connection = null;
      joined = false;
      reject(error);
    } else resolve();
  };
  const entry = (id) => {
    let e = faces.get(id);
    if (!e) {
      e = { ball: createFaceBall(scene, { placed: false }), pose: null, current: null, free: false, connected: true, shown: false };
      scene.add(e.ball.group);
      faces.set(id, e);
    }
    return e;
  };
  const drop = (id) => {
    const e = faces.get(id);
    if (!e) return;
    e.ball.remove();
    faces.delete(id);
  };

  /** A guest (the row of `player`): face, name, country. */
  const onPlayer = (row) => {
    const id = hex(row.identity);
    if (id === myId) {
      finishJoin(); // the own row is there: the room is set up
      return;
    }
    let face = null;
    try {
      face = JSON.parse(row.face);
    } catch {
      /* a face that is not JSON: none shown */
    }
    const e = entry(id);
    e.connected = row.connected;
    if (isFace(face)) {
      e.ball.show(face, row.name, row.country);
      e.shown = true;
    }
  };
  /** The place of a guest (the row of `presence`). */
  const onPresence = (row) => {
    const id = hex(row.identity);
    if (id === myId) return;
    const e = entry(id);
    e.pose = { x: row.x, y: row.y, z: row.z, yaw: row.yaw, pitch: row.pitch };
    e.free = row.free;
    e.current ??= { ...e.pose };
  };

  function connect(profile) {
    const args = {
      name: displayName(profile, "short"),
      country: profile.country ?? DEFAULT_COUNTRY,
      face: JSON.stringify(profile.face),
      money: profile.money,
    };
    connection = DbConnection.builder()
      .withUri(MULTIPLAYER_URI)
      .withDatabaseName(MULTIPLAYER_DATABASE)
      .withToken(loadToken())
      .withAutomaticReconnect()
      .onConnect((conn, identity, token) => {
        saveToken(token);
        myId = hex(identity);
        conn.db.player.onInsert((_ctx, row) => onPlayer(row));
        conn.db.player.onUpdate((_ctx, _old, row) => onPlayer(row));
        conn.db.player.onDelete((_ctx, row) => drop(hex(row.identity)));
        conn.db.presence.onInsert((_ctx, row) => onPresence(row));
        conn.db.presence.onUpdate((_ctx, _old, row) => onPresence(row));
        conn.db.presence.onDelete((_ctx, row) => {
          const e = faces.get(hex(row.identity));
          if (e) e.free = false; // away: no face (the guest stays in the list)
        });
        conn.subscriptionBuilder().subscribe([tables.player, tables.presence]);
        conn.reducers.setProfile(args);
        joined = true;
        sentFree = null;
        console.info("[Backroom Billard] multiplayer: connected as", myId.slice(0, 8));
      })
      .onConnectError((_ctx, error) => {
        console.warn("[Backroom Billard] multiplayer: no connection:", error);
        finishJoin(error instanceof Error ? error : new Error(String(error)));
      })
      .onDisconnect(() => {
        joined = false;
        for (const id of [...faces.keys()]) drop(id);
      })
      .build();
  }

  return {
    /**
     * Join the room with the profile of the welcome screen. Resolves when the room is set up (connected, the
     * guest is in the list), rejects if that does not work (no connection, or it takes too long).
     * @returns {Promise<void>}
     */
    join(profile) {
      return new Promise((resolve, reject) => {
        if (connection) {
          resolve(); // already in
          return;
        }
        ready = { resolve, reject, timer: window.setTimeout(() => finishJoin(new Error("timeout")), MULTIPLAYER_JOIN_SECONDS * 1000) };
        try {
          connect(profile);
        } catch (error) {
          finishJoin(error);
        }
      });
    },
    /** Every frame: the sign of life, the place of the own camera, the faces of the others follow their cameras. */
    update(dt, camera, free) {
      for (const e of faces.values()) {
        if (!e.pose || !e.current) continue;
        const k = 1 - Math.exp(-dt * MULTIPLAYER_FACE_FOLLOW);
        const c = e.current;
        c.x += (e.pose.x - c.x) * k;
        c.y += (e.pose.y - c.y) * k;
        c.z += (e.pose.z - c.z) * k;
        c.yaw += wrap(e.pose.yaw - c.yaw) * k;
        c.pitch += (e.pose.pitch - c.pitch) * k;
        e.ball.setPose(c.x, c.y, c.z, c.yaw, c.pitch);
        e.ball.setVisible(e.free && e.connected && e.shown);
      }
      if (!connection || !joined) return;
      try {
        heartbeatAge += dt;
        if (heartbeatAge >= MULTIPLAYER_HEARTBEAT_SECONDS) {
          heartbeatAge = 0;
          connection.reducers.heartbeat();
        }
        presenceAge += dt;
        // the free camera: its place about 10 times per second; otherwise only the change ("away") once
        if (presenceAge >= MULTIPLAYER_PRESENCE_SECONDS && (free || sentFree !== false)) {
          presenceAge = 0;
          euler.setFromQuaternion(camera.quaternion, "YXZ");
          connection.reducers.setPresence({ x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: euler.y, pitch: euler.x, free });
          sentFree = free;
        }
      } catch (error) {
        console.warn("[Backroom Billard] multiplayer: sending failed:", error);
      }
    },
  };
}
