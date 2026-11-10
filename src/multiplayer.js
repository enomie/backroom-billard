/**
 * The connection to the others (SpacetimeDB on Maincloud): the guest joins the room with his name,
 * country and face after the welcome screen, sends a sign of life and where his camera is, and sees the
 * faces of the others where their cameras are (free camera or behind the cue). Only used in multiplayer (the welcome screen
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
 * @param {(event: object) => void} onGame — the game: { kind: "init" | "start" | "turn" | "sync" | "over", … }, see
 *   onGameRow below (who is up, the end of a shot of somebody else with the balls where they lie, the result)
 */
export function createMultiplayer(scene, onRoom, onNote, onGame) {
  let connection = null;
  let myId = ""; // the identity of this guest (hex)
  let joined = false;
  const faces = new Map(); // identity (hex) → { ball, pose: { x, y, z, yaw, pitch } | null, connected }
  let heartbeatAge = 0;
  let presenceAge = 0;

  let ready = null; // { resolve, reject, timer } while joining
  let lastHand = "false/false"; // what the database knows about my hands
  let lastKit = ""; // and about my drink and cigarettes
  const kits = new Map(); // identity (hex) → the last kit row of a guest
  const roster = new Map(); // identity (hex) → { name, seat, connected, joinedAt }: who is in the room
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
      e = { ball: createFaceBall(scene, { placed: false }), pose: null, current: null, connected: true, shown: false };
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
    const joinedAt = row.joinedAt.microsSinceUnixEpoch;
    roster.set(id, { name: row.name, seat: row.seat, connected: row.connected, joinedAt });
    // news only about what happens after I am in the room: a guest who came after me, or who goes (not those who were here before me)
    if (joined && looked && id !== myId && (!before || before.connected !== row.connected)) {
      if (!row.connected) onNote("left", row.name);
      else if (joinedAt >= (roster.get(myId)?.joinedAt ?? 0n)) onNote("joined", row.name);
    }
    if (joined || id === myId) tellRoom();
    if (id !== myId && row.seat > 0 && row.seat !== before?.seat && kits.has(id)) {
      const k = kits.get(id); // he sat down: what stands at his seat
      onGame({ kind: "kit", seat: row.seat, drink: k.drink, sips: k.sips, pack: k.pack, packCount: k.packCount });
    }
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
          if (e) e.pose = null; // away: the face stays where it was until the guest is gone from the list
        });
        // The game: what the row says is turned into events for the game (after the first look; a guest who comes into a running game gets "init")
        let before = { state: 0, turnSeat: 0, shotRunning: false };
        let shooterSeat = 0; // the seat of the one whose shot is running
        const nameOf = (seat) => [...roster.values()].find((p) => p.seat === seat)?.name ?? "";
        const mySeat = () => roster.get(myId)?.seat ?? 0;
        const onGameRow = (row) => {
          const running = row.state === 1;
          if (looked) {
            if (running && before.state !== 1) onGame({ kind: "start", firstName: nameOf(row.turnSeat) });
            const shotJustEnded = before.shotRunning && !row.shotRunning;
            if (running && (before.state !== 1 || row.turnSeat !== before.turnSeat || shotJustEnded)) {
              // (also when the same one shoots again: his camera has to come back to the cue)
              onGame({ kind: "turn", myTurn: row.turnSeat === mySeat(), turnSeat: row.turnSeat, turnName: nameOf(row.turnSeat), first: before.state !== 1, changed: row.turnSeat !== before.turnSeat });
            }
            if (row.shotRunning && !before.shotRunning) {
              shooterSeat = row.turnSeat;
              if (shooterSeat !== mySeat()) onGame({ kind: "shotStart" }); // the recording of somebody else's shot will come
            }
            if (before.shotRunning && !row.shotRunning && shooterSeat !== mySeat()) {
              // the shot of another guest is over: the balls lie where his table has them
              onGame({ kind: "sync", balls: [...conn.db.ball.iter()].map((b) => ({ id: b.id, x: b.x, z: b.z, pocketed: b.pocketed })) });
            }
            if (before.state === 1 && !running && row.winnerSeat > 0) {
              const loserSeat = row.winnerSeat === 1 ? 2 : 1;
              onGame({ kind: "over", iWon: row.winnerSeat === mySeat(), isPlayer: mySeat() > 0, winnerName: nameOf(row.winnerSeat), loserName: nameOf(loserSeat), reason: row.reason });
            }
          }
          before = { state: row.state, turnSeat: row.turnSeat, shotRunning: row.shotRunning };
        };
        // somebody of the finished game wants to play again
        conn.db.rematch.onInsert((_ctx, row) => {
          if (looked && hex(row.identity) !== myId) onGame({ kind: "again", name: roster.get(hex(row.identity))?.name ?? "" });
        });
        // the aim of the one who is up (the cue moves for the others) and the pieces of the recording of his shot
        const onAim = (row) => {
          if (looked && row.seat === before.turnSeat && row.seat !== mySeat()) onGame({ kind: "aim", angle: row.angle, pitch: row.elevation, x: row.nubX, y: row.nubY });
        };
        conn.db.aim.onInsert((_ctx, row) => onAim(row));
        conn.db.aim.onUpdate((_ctx, _old, row) => onAim(row));
        conn.db.shotChunk.onInsert((_ctx, row) => {
          if (looked && before.shotRunning && shooterSeat !== mySeat()) onGame({ kind: "chunk", index: row.index, data: row.data });
        });
        // what the others do with their hands: drinking (R) and smoking (T)
        const onHand = (row) => {
          const id = hex(row.identity);
          const seat = roster.get(id)?.seat ?? 0;
          if (id !== myId && seat > 0) onGame({ kind: "hand", seat, drinking: row.drinking, smoking: row.smoking });
        };
        // what stands at the seats of the others (drink and cigarettes); a guest's seat may come after his kit: it is kept
        const onKit = (row) => {
          const id = hex(row.identity);
          kits.set(id, row);
          const seat = roster.get(id)?.seat ?? 0;
          if (id !== myId && seat > 0) onGame({ kind: "kit", seat, drink: row.drink, sips: row.sips, pack: row.pack, packCount: row.packCount });
        };
        conn.db.kit.onInsert((_ctx, row) => onKit(row));
        conn.db.kit.onUpdate((_ctx, _old, row) => onKit(row));
        conn.db.hand.onInsert((_ctx, row) => onHand(row));
        conn.db.hand.onUpdate((_ctx, _old, row) => onHand(row));
        conn.db.hand.onDelete((_ctx, row) => onHand({ ...row, drinking: false, smoking: false }));
        conn.db.game.onInsert((_ctx, row) => onGameRow(row));
        conn.db.game.onUpdate((_ctx, _old, row) => onGameRow(row));
        conn.subscriptionBuilder()
          .onApplied(() => {
            looked = true; // the guests that were there already are no news
            const game = conn.db.game.id.find(1);
            if (game?.state === 1) onGame({ kind: "init", myTurn: game.turnSeat === mySeat(), turnSeat: game.turnSeat, turnName: nameOf(game.turnSeat) });
          })
          .subscribe([tables.player, tables.presence, tables.game, tables.ball, tables.rematch, tables.aim, tables.shotChunk, tables.hand, tables.kit]);
        call(() => conn.reducers.setProfile(args)); // `joined` becomes true when the own row is there (see onPlayer)
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
     * The shooter says that his shot begins (the database checks that he is up). Returns the number of the shot: the
     * database counts one up, and the pieces of the recording must carry that number (the news of the database
     * is not here yet when the first piece goes out).
     */
    takeShot(shot) {
      const seq = (connection?.db.game.id.find(1)?.shotSeq ?? 0) + 1;
      call(() => connection?.reducers.takeShot(shot));
      return seq;
    },
    /** The R key (drinking) and the T key (smoking) of this guest went down or up; only a change is sent. */
    setHand(hand) {
      const text = `${hand.drinking}/${hand.smoking}`;
      if (!joined || text === lastHand) return;
      lastHand = text;
      call(() => connection?.reducers.setHand({ drinking: hand.drinking, smoking: hand.smoking }));
    },
    /** The drink and the cigarettes of this guest ({ drink, sips, pack, packCount }); only a change is sent. */
    setKit(kit) {
      const text = `${kit.drink}/${kit.sips}/${kit.pack}/${kit.packCount}`;
      if (!joined || text === lastKit) return;
      lastKit = text;
      call(() => connection?.reducers.setKit(kit));
    },
    /** Where the heads of the others are now: [{ x, y, z }]. */
    heads() {
      return [...faces.values()].filter((e) => e.current && e.connected && e.shown).map((e) => e.current);
    },
    /** Where the head of the guest on a seat is now (smoothed), or null: { x, y, z, yaw, pitch }. */
    poseOf(seat) {
      const id = [...roster.entries()].find(([, p]) => p.seat === seat)?.[0];
      return (id && faces.get(id)?.current) || null;
    },
    /** The aim of the one who is up (about 15 times per second): angle, pitch, where the tip meets the ball, power. */
    setAim(aim) {
      call(() => connection?.reducers.setAim(aim));
    },
    /** A piece of the recording of my shot. */
    pushChunk(index, data, shotSeq) {
      call(() => connection?.reducers.pushChunk({ shotSeq, index, data }));
    },
    /** "Play again": the next game begins when both players have pressed it. */
    playAgain() {
      call(() => connection?.reducers.playAgain());
    },
    /** The shot is over: what happened and where the balls lie (the database applies the rules and says who is up next). */
    endShot(result, shotSeq) {
      call(() => connection?.reducers.endShot({ shotSeq, ...result }));
    },
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
        e.ball.setVisible(e.connected && e.shown); // (also in the cue view: his head is behind the cue then)
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
        // the place of the camera about 10 times per second (free camera or cue view: the head is where the camera is)
        if (presenceAge >= MULTIPLAYER_PRESENCE_SECONDS) {
          presenceAge = 0;
          euler.setFromQuaternion(camera.quaternion, "YXZ");
          call(() => connection.reducers.setPresence({ x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: euler.y, pitch: euler.x, free }));
        }
      } catch (error) {
        console.warn("[Backroom Billard] multiplayer: sending failed:", error);
      }
    },
  };
}
