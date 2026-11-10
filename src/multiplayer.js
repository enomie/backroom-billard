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
/** Call a reducer; a refusal or a lost connection is only noted (the call is a promise), it must not stop the game. */
const call = (fn) => {
  try {
    fn()?.catch?.((error) => console.warn("[Backroom Billard] multiplayer: the database said no:", error?.message ?? error));
  } catch (error) {
    console.warn("[Backroom Billard] multiplayer: call failed:", error);
  }
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const euler = new THREE.Euler();

/**
 * @param {THREE.Scene} scene
 * @param {(room: { others: number, taken: boolean[], mySide: number | null }) => void} onRoom — called when somebody
 *   comes or goes: how many others are here, which seats of the table are taken (index 0 = the −z side, 1 = the +z
 *   side) and the seat of this guest (null: a spectator). The first two guests present take the seats: the one
 *   who came first sits on the +z side.
 * @param {(kind: "joined" | "left", name: string) => void} onNote — somebody joined or left (after the first look into the room)
 * @param {(firstName: string) => void} onGameStart — the game starts (two guests sit at the table); the name of the one who shoots first
 */
export function createMultiplayer(scene, onRoom, onNote, onGameStart) {
  let connection = null;
  let myId = ""; // the identity of this guest (hex)
  let joined = false;
  const faces = new Map(); // identity (hex) → { ball, pose: { x, y, z, yaw, pitch } | null, free, connected }
  let heartbeatAge = 0;
  let presenceAge = 0;
  let sentFree = null; // what the database knows about the free camera of this guest

  let ready = null; // { resolve, reject, timer } while joining
  const roster = new Map(); // identity (hex) → { name, seat, connected }: who is in the room
  let looked = false; // the first look into the room is done: from now on a new face is news
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

  /** Who sits at the table and who is here. The database gives the seats: seat 1 is the +z side of the table, seat 2 the −z side. */
  const tellRoom = () => {
    const guests = [...roster.entries()];
    const seat = roster.get(myId)?.seat ?? 0;
    onRoom({
      others: guests.filter(([id, p]) => id !== myId && p.connected).length,
      taken: [guests.some(([, p]) => p.seat === 2), guests.some(([, p]) => p.seat === 1)],
      mySide: seat === 1 ? 1 : seat === 2 ? 0 : null,
    });
  };
  /** A guest (the row of `player`): face, name, country. */
  const onPlayer = (row) => {
    const id = hex(row.identity);
    const before = roster.get(id);
    roster.set(id, { name: row.name, seat: row.seat, connected: row.connected });
    if (looked && id !== myId && (!before || before.connected !== row.connected)) onNote(row.connected ? "joined" : "left", row.name);
    if (joined || id === myId) tellRoom();
    if (id === myId) {
      joined = true; // the own row is there: the room is set up, signs of life and places may follow
      finishJoin();
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
        conn.db.player.onDelete((_ctx, row) => {
          const id = hex(row.identity);
          const gone = roster.get(id);
          roster.delete(id);
          drop(id);
          if (looked && gone?.connected) onNote("left", gone.name);
          tellRoom();
        });
        conn.db.presence.onInsert((_ctx, row) => onPresence(row));
        conn.db.presence.onUpdate((_ctx, _old, row) => onPresence(row));
        conn.db.presence.onDelete((_ctx, row) => {
          const e = faces.get(hex(row.identity));
          if (e) e.free = false; // away: no face (the guest stays in the list)
        });
        // the game starts when it turns to "playing" (after the first look: a guest who comes into a running game is no start)
        let playing = false;
        const onGame = (row) => {
          const now = row.state === 1;
          if (looked && now && !playing) {
            const first = [...roster.values()].find((p) => p.seat === row.turnSeat);
            onGameStart(first?.name ?? "");
          }
          playing = now;
        };
        conn.db.game.onInsert((_ctx, row) => onGame(row));
        conn.db.game.onUpdate((_ctx, _old, row) => onGame(row));
        conn.subscriptionBuilder()
          .onApplied(() => {
            looked = true; // the guests that were there already are no news
          })
          .subscribe([tables.player, tables.presence, tables.game]);
        call(() => conn.reducers.setProfile(args)); // `joined` becomes true when the own row is there (see onPlayer)
        sentFree = null;
        console.info("[Backroom Billard] multiplayer: connected as", myId.slice(0, 8));
      })
      .onConnectError((_ctx, error) => {
        console.warn("[Backroom Billard] multiplayer: no connection:", error);
        finishJoin(error instanceof Error ? error : new Error(String(error)));
      })
      .onDisconnect(() => {
        joined = false;
        looked = false;
        roster.clear();
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
          call(() => connection.reducers.heartbeat());
          call(() => connection.reducers.checkTimeouts()); // a player who is gone for 10 s has lost (anybody may ask)
        }
        presenceAge += dt;
        // the free camera: its place about 10 times per second; otherwise only the change ("away") once
        if (presenceAge >= MULTIPLAYER_PRESENCE_SECONDS && (free || sentFree !== false)) {
          presenceAge = 0;
          euler.setFromQuaternion(camera.quaternion, "YXZ");
          call(() => connection.reducers.setPresence({ x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: euler.y, pitch: euler.x, free }));
          sentFree = free;
        }
      } catch (error) {
        console.warn("[Backroom Billard] multiplayer: sending failed:", error);
      }
    },
  };
}
