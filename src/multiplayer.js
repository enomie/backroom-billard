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
import { encodeKeys, decodeKeys } from "./piano-keys.js";
import { makeKey, loadKey, saveKey } from "./account-key.js";
import {
  MULTIPLAYER_URI,
  MULTIPLAYER_DATABASE,
  MULTIPLAYER_TOKEN_KEY,
  MULTIPLAYER_HEARTBEAT_SECONDS,
  MULTIPLAYER_PRESENCE_SECONDS,
  MULTIPLAYER_FACE_FOLLOW,
  MULTIPLAYER_JOIN_SECONDS,
  MULTIPLAYER_NOTE_SECONDS,
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
let kickedHandler = null; // set by the room: the account was opened on another device
let refusedHandler = null; // set by the room: the database said no (the text of its refusal)
const isKicked = (error) => String(error?.message ?? error).includes("logged-in-elsewhere");
/** Call a reducer; a refusal or a lost connection is only noted (the call is a promise), it must not stop the game. `refused` is told when the database says no. */
const call = (fn, refused) => {
  try {
    fn()?.catch?.((error) => {
      if (isKicked(error)) kickedHandler?.();
      else {
        console.warn("[Backroom Billard] multiplayer: the database said no:", error?.message ?? error);
        refusedHandler?.(String(error?.message ?? error));
        refused?.();
      }
    });
  } catch (error) {
    console.warn("[Backroom Billard] multiplayer: call failed:", error);
  }
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const euler = new THREE.Euler();

/**
 * @param {THREE.Scene} scene
 * @param {(room: { players: { name: string, country: string, money: number }[], others: number, taken: boolean[], mySide: number | null }) => void} onRoom — called when somebody
 *   comes or goes: how many others are here, which seats of the table are taken (index 0 = the −z side, 1 = the +z
 *   side) and the seat of this guest (null: a spectator). The first two guests present take the seats: the one
 *   who came first sits on the +z side.
 * @param {(kind: "joined" | "left", name: string) => void} onNote — somebody joined or left (after the first look into the room)
 * @param {(event: object) => void} onGame — the game: { kind: "init" | "start" | "turn" | "sync" | "over" | "table", … }, see
 *   onGameRow below (who is up, the end of a shot of somebody else with the balls where they lie, the result)
 */
export function createMultiplayer(scene, onRoom, announce, onGame) {
  // "left" waits a few seconds: if the same guest comes back meanwhile (a reload, a flickering connection), neither is news;
  // and the same guest joining again within a few seconds is announced once
  const leaving = new Map(); // name → timer of the waiting "left"
  const joinedAtMs = new Map(); // name → when "joined" was last announced
  const onNote = (kind, name) => {
    if (kind === "left") {
      if (leaving.has(name)) return;
      leaving.set(name, window.setTimeout(() => {
        leaving.delete(name);
        joinedAtMs.delete(name);
        announce("left", name);
      }, MULTIPLAYER_NOTE_SECONDS * 1000));
      return;
    }
    if (leaving.has(name)) {
      window.clearTimeout(leaving.get(name)); // he is back: no news
      leaving.delete(name);
      return;
    }
    const last = joinedAtMs.get(name);
    if (last !== undefined && performance.now() - last < MULTIPLAYER_NOTE_SECONDS * 1000) return;
    joinedAtMs.set(name, performance.now());
    announce("joined", name);
  };
  let connection = null;
  let myId = ""; // the identity of this guest (hex)
  let joined = false;
  const faces = new Map(); // identity (hex) → { ball, pose: { x, y, z, yaw, pitch } | null, connected }
  let heartbeatAge = 0;
  let presenceAge = 0;

  let loginWait = null; // { resolve, reject, timer } while the welcome screen waits for the login
  let joinWait = null; // the same while he comes into the room
  let spec = null; // how to log in: { key } or { create: { name, country, face } } (after a login: { key })
  let stage = "none"; // "lobby" (logged in) or "room" (in the room: a lost connection or removal comes back into it)
  let lobbyInfo = null; // the account as the lobby shows it: { name, country, face, money, key }
  let loginInfo = null; // the lobby row of this login arrived
  let loginDone = false; // and the login call went through
  let lastHand = "false/false"; // what the database knows about my hands
  let lastKit = ""; // and about my drink and cigarettes
  const kits = new Map(); // identity (hex) → the last kit row of a guest
  const roster = new Map(); // identity (hex) → { name, country, money, seat, connected, joinedAt }: who is in the room
  let looked = false; // the first look into the room is done: from now on a new face is news
  const hex = (identity) => identity.toHexString();
  let clockOffset = 0; // the database's clock minus this browser's (ms), worked out from the sign of life the database stamps on my row
  let tellTableNow = null; // set when the connection is there: sends the stake window and the bids to the game
  const closeConnection = () => {
    try {
      connection?.disconnect();
    } catch {
      /* nothing to close */
    }
    connection = null;
    joined = false;
  };
  const settle = (wait, error, value) => {
    window.clearTimeout(wait.timer);
    if (error) wait.reject(error);
    else wait.resolve(value);
  };
  const finishLogin = (error, info) => {
    if (!loginWait) return;
    const wait = loginWait;
    loginWait = null;
    settle(wait, error, info);
  };
  const finishJoin = (error) => {
    if (!joinWait) return;
    const wait = joinWait;
    joinWait = null;
    settle(wait, error);
  };
  const asError = (error) => (error instanceof Error ? error : new Error(String(error?.message ?? error)));
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
    const playerOfSeat = (seat) => {
      const p = guests.find(([, g]) => g.seat === seat)?.[1];
      return { name: p?.name ?? "", country: p?.country ?? "", money: p?.money ?? 0 };
    };
    onRoom({
      players: [playerOfSeat(1), playerOfSeat(2)], // the two at the table (seat 1, seat 2): name and country
      others: guests.filter(([id, p]) => id !== myId && p.connected).length,
      taken: [guests.some(([, p]) => p.seat === 2), guests.some(([, p]) => p.seat === 1)],
      mySide: seat === 1 ? 1 : seat === 2 ? 0 : null,
    });
    tellTableNow?.(); // (the offers and bids carry names and money)
  };
  /** A guest (the row of `player`): face, name, country. */
  const onPlayer = (row) => {
    const id = hex(row.identity);
    const before = roster.get(id);
    const joinedAt = row.joinedAt.microsSinceUnixEpoch;
    roster.set(id, { name: row.name, country: row.country, money: row.money, seat: row.seat, connected: row.connected, joinedAt });
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
      clockOffset = Number(row.lastSeen.microsSinceUnixEpoch / 1000n) - Date.now();
      onGame({ kind: "money", money: row.money }); // (the server counts my money)
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

  let kicked = false; // the account was opened on another device: this one is logged out for good
  const kick = () => {
    if (kicked) return;
    kicked = true;
    stage = "none";
    closeConnection();
    onGame({ kind: "kicked" });
  };
  kickedHandler = kick;
  refusedHandler = (message) => onGame({ kind: "refused", message });

  /** The login of `spec` (see above): a new account (the key is made up here) or the key; the key is kept in localStorage once the database accepted it. */
  function runLogin(conn) {
    if (!spec) return;
    loginInfo = null;
    loginDone = false;
    let key = spec.key ?? (spec.create ? makeKey() : loadKey());
    if (!key) {
      finishLogin(new Error("no-key"));
      return;
    }
    const attempt = spec.create ? conn.reducers.createAccount({ key, ...spec.create }) : conn.reducers.enter({ key });
    Promise.resolve(attempt)
      .then(() => {
        saveKey(key);
        spec = { key };
        loginDone = true;
        if (stage === "room") call(() => conn.reducers.joinRoom());
        if (loginInfo) {
          lobbyInfo = { ...loginInfo, key };
          finishLogin(null, lobbyInfo);
        }
      })
      .catch((error) => {
        if (isKicked(error)) return kick();
        console.warn("[Backroom Billard] multiplayer: could not log in:", error?.message ?? error);
        const unknown = String(error?.message ?? error).includes("unknown key");
        finishLogin(unknown ? new Error("unknown-key") : asError(error));
      });
  }

  function connect() {
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
          if (id === myId) {
            // the database took me out (a long pause, a throttled tab): come back into the room
            joined = false;
            if (!kicked && stage === "room") call(() => conn.reducers.joinRoom());
            return;
          }
          const gone = roster.get(id);
          roster.delete(id);
          drop(id);
          if (looked && gone?.connected) onNote("left", gone.name);
          tellRoom();
        });
        // the account while he chooses at the welcome screen (before the room)
        const onLobby = (row) => {
          if (hex(row.identity) !== myId) return;
          loginInfo = { name: row.name, country: row.country, face: row.face, money: row.money };
          lobbyInfo = { ...loginInfo, key: spec?.key ?? "" };
          if (loginDone) finishLogin(null, lobbyInfo);
        };
        conn.db.lobby.onInsert((_ctx, row) => onLobby(row));
        conn.db.lobby.onUpdate((_ctx, _old, row) => onLobby(row));
        // the world ranking: the whole list and my own place, told after the changes of one update have arrived
        let rankingQueued = false;
        const tellRanking = () => {
          if (rankingQueued) return;
          rankingQueued = true;
          queueMicrotask(() => {
            rankingQueued = false;
            const own = [...conn.db.standing.iter()].find((s) => hex(s.identity) === myId);
            onGame({
              kind: "ranking",
              rows: [...conn.db.ranking.iter()].map((r) => ({ place: r.place, name: r.name, country: r.country, money: r.money })).sort((a, b) => a.place - b.place),
              mine: own ? { place: own.place, money: own.money } : null,
            });
          });
        };
        for (const table of [conn.db.ranking, conn.db.standing]) {
          table.onInsert(tellRanking);
          table.onUpdate(tellRanking);
          table.onDelete(tellRanking);
        }
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
              onGame({ kind: "turn", myTurn: row.turnSeat === mySeat(), turnSeat: row.turnSeat });
            }
            if (row.shotRunning && !before.shotRunning) {
              shooterSeat = row.turnSeat;
              if (shooterSeat !== mySeat()) onGame({ kind: "shotStart" }); // the recording of somebody else's shot will come
            }
            if (before.shotRunning && !row.shotRunning && shooterSeat !== mySeat()) {
              // the shot of another guest is over: the balls lie where his table has them
              onGame({ kind: "sync", balls: [...conn.db.ball.iter()].map((b) => ({ id: b.id, x: b.x, z: b.z, pocketed: b.pocketed })) });
            }
            if (before.state === 1 && !running) {
              const loserSeat = row.winnerSeat === 1 ? 2 : 1;
              onGame({ kind: "over", iWon: row.winnerSeat === mySeat(), isPlayer: mySeat() > 0, winnerName: nameOf(row.winnerSeat), loserName: nameOf(loserSeat), reason: row.reason });
            }
          }
          before = { state: row.state, turnSeat: row.turnSeat, shotRunning: row.shotRunning };
          tellTableNow?.(); // (null after a lost connection)
        };
        // The stake window and the table bets: the whole picture each time something changes (offers are shown with the money of the guest as the limit)
        const idOfSeat = (seat) => [...roster.entries()].find(([, p]) => p.seat === seat)?.[0];
        tellTableNow = () => {
          if (!looked) return;
          const game = conn.db.game.id.find(1);
          const stakes = [...conn.db.stake.iter()];
          const offerOf = (seat) => {
            const id = idOfSeat(seat);
            const row = id && stakes.find((r) => hex(r.identity) === id);
            return row ? { amount: Math.min(row.amount, roster.get(id).money), ready: row.ready } : null;
          };
          const offers = [offerOf(1), offerOf(2)];
          const agreed = offers[0] && offers[1] ? Math.min(offers[0].amount, offers[1].amount) : 0;
          const staking = game?.state === 2;
          const bids = [...conn.db.bid.iter()]
            .map((b) => ({ id: hex(b.bidder), name: roster.get(hex(b.bidder))?.name ?? "", amount: b.amount, placedAt: b.placedAt.microsSinceUnixEpoch }))
            .sort((a, b) => b.amount - a.amount || Number(a.placedAt - b.placedAt));
          onGame({
            kind: "table",
            staking,
            offers, // by seat: [seat 1, seat 2], each { amount, ready } or null
            stake: staking ? agreed : game?.state === 1 ? game.stake : 0, // what each puts in: agreed now, or of the running game
            bids: bids.map((b) => ({ name: b.name, amount: b.amount, mine: b.id === myId })),
          });
        };
        for (const table of [conn.db.stake, conn.db.bid]) {
          table.onInsert(() => tellTableNow());
          table.onUpdate(() => tellTableNow());
          table.onDelete(() => tellTableNow());
        }
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
        // who pocketed which ball (the two lists above the table): the whole list each time something changes
        const tellPockets = () => onGame({ kind: "pockets", rows: [...conn.db.pocket.iter()].map((p) => ({ ball: p.ballId, seat: p.seat })) });
        // the radio: on or off for everybody (no row: on); a change by somebody else is news
        const tellRadio = (on, byName, mine, quiet) => onGame({ kind: "radio", on, byName, mine, quiet });
        conn.db.radio.onInsert((_ctx, row) => looked && tellRadio(row.on, row.byName, hex(row.by) === myId, false));
        conn.db.radio.onUpdate((_ctx, _old, row) => looked && tellRadio(row.on, row.byName, hex(row.by) === myId, false));
        conn.db.radio.onDelete(() => looked && tellRadio(true, "", false, true)); // (nobody was here: on again)
        // the countdown of the one who is up: when his turn began (the database's time) and whether his shot is on its way
        const tellClock = (row) => onGame({ kind: "clock", startedAt: Number(row.startedAt.microsSinceUnixEpoch / 1000n), running: row.running });
        conn.db.turn.onInsert((_ctx, row) => tellClock(row));
        conn.db.turn.onUpdate((_ctx, _old, row) => tellClock(row));
        // the grand piano: who sits there and which keys are down (a guest who comes later gets the state at once)
        const tellPiano = (row) =>
          onGame({ kind: "piano", sitter: row.sitter ? (roster.get(hex(row.sitter))?.name ?? "") : null, mine: !!row.sitter && hex(row.sitter) === myId, midis: decodeKeys(row.keys) });
        conn.db.piano.onInsert((_ctx, row) => looked && tellPiano(row));
        conn.db.piano.onUpdate((_ctx, _old, row) => looked && tellPiano(row));
        conn.db.pocket.onInsert(tellPockets);
        conn.db.pocket.onDelete(tellPockets);
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
            tellTableNow();
            const piano = conn.db.piano.id.find(1);
            if (piano) tellPiano(piano);
            const turn = conn.db.turn.id.find(1);
            if (turn) tellClock(turn);
            const radio = conn.db.radio.id.find(1);
            tellRadio(radio ? radio.on : true, "", false, true); // (the state as it is: no news)
            const game = conn.db.game.id.find(1);
            if (game?.state === 1) onGame({ kind: "init", myTurn: game.turnSeat === mySeat(), turnSeat: game.turnSeat });
          })
          .subscribe([tables.player, tables.presence, tables.game, tables.ball, tables.aim, tables.shotChunk, tables.hand, tables.kit, tables.pocket, tables.stake, tables.bid, tables.piano, tables.lobby, tables.ranking, tables.standing, tables.turn, tables.radio]);
        runLogin(conn); // (also after a lost connection: log in again, and come back into the room if he was in it)
        console.info("[Backroom Billard] multiplayer: connected as", myId.slice(0, 8));
      })
      .onConnectError((_ctx, error) => {
        console.warn("[Backroom Billard] multiplayer: no connection:", error);
        finishLogin(asError(error));
        finishJoin(asError(error));
        closeConnection();
      })
      .onDisconnect(() => {
        joined = false;
        looked = false;
        tellTableNow = null;
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
    /** The database's clock now (ms since 1970), as far as this browser can tell: for the countdown. */
    serverNow() {
      return Date.now() + clockOffset;
    },
    /** Switch the radio on or off for everybody in the room (the database allows it every 5 seconds). */
    setRadio(on) {
      call(() => connection?.reducers.setRadio({ on }));
    },
    /** Get up from the table (a game that runs is lost); he sits down again with takeSeat or a table bet. */
    leaveTable() {
      call(() => connection?.reducers.leaveTable());
    },
    /** Sit down at a free seat of the table (when nobody plays). */
    takeSeat() {
      call(() => connection?.reducers.takeSeat());
    },
    /** Ask the database to work the world ranking out (it does at most every 5 s). */
    refreshRanking() {
      call(() => connection?.reducers.refreshRanking());
    },
    /** Buy a drink (its glass kind) or "pack" at the bar: the database takes the price from the account, or says no (then the money is shown as the database has it). */
    buy(item) {
      call(() => connection?.reducers.buy({ item }), () => onGame({ kind: "money", money: roster.get(myId)?.money ?? 0 }));
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
    /** Sit down at the grand piano (the database lets only one sit there, and not the one who is up at the table). */
    sitPiano() {
      call(() => connection?.reducers.sitPiano());
    },
    /** Get up from the grand piano. */
    leavePiano() {
      call(() => connection?.reducers.leavePiano());
    },
    /** The keys of the grand piano I hold (midi numbers); sent when they change, the others hear them. */
    playKeys(midis) {
      const keys = encodeKeys(midis);
      call(() => connection?.reducers.playKeys({ keys }));
    },
    /** The stake window: my offer (the stake is the smaller of the two offers). */
    setStake(amount) {
      call(() => connection?.reducers.setStake({ amount }));
    },
    /** The stake window: Ready (or not any more); the game begins when both are ready. */
    setReady(ready) {
      call(() => connection?.reducers.setReady({ ready }));
    },
    /** Table bet of a spectator: the highest bid challenges the winner. */
    placeBid(amount) {
      call(() => connection?.reducers.placeBid({ amount }));
    },
    withdrawBid() {
      call(() => connection?.reducers.withdrawBid());
    },
    /** The shot is over: what happened and where the balls lie (the database applies the rules and says who is up next). */
    endShot(result, shotSeq) {
      call(() => connection?.reducers.endShot({ shotSeq, ...result }));
    },
    /**
     * Log in (the welcome screen, multiplayer): `{ create: { name, country, face } }` makes a new account (the key is made up here and kept),
     * `{ key }` logs in with a key, `{}` with the key of this browser. Connects first. Resolves with the account { name, country, face, money, key }
     * (he is not in the room yet), rejects with "unknown-key" (the database has no such account), "no-key", "timeout" or the refusal.
     * @param {{ key?: string, create?: { name: string, country: string, face: string } }} next
     * @returns {Promise<{ name: string, country: string, face: string, money: number, key: string }>}
     */
    login(next) {
      return new Promise((resolve, reject) => {
        const key = next.key ?? (next.create ? null : loadKey());
        if (connection && lobbyInfo && key && key === spec?.key) {
          resolve(lobbyInfo); // already logged in to this account
          return;
        }
        spec = next.create ? next : { key };
        lobbyInfo = null;
        loginWait = { resolve, reject, timer: window.setTimeout(() => { finishLogin(new Error("timeout")); closeConnection(); }, MULTIPLAYER_JOIN_SECONDS * 1000) };
        kicked = false;
        try {
          if (connection) runLogin(connection);
          else connect();
        } catch (error) {
          finishLogin(asError(error));
        }
      });
    },
    /**
     * Come into the room with the account of the login. Resolves when the room is set up (the guest is in the list).
     * @returns {Promise<void>}
     */
    join() {
      return new Promise((resolve, reject) => {
        if (joined) {
          resolve();
          return;
        }
        stage = "room";
        joinWait = { resolve, reject, timer: window.setTimeout(() => finishJoin(new Error("timeout")), MULTIPLAYER_JOIN_SECONDS * 1000) };
        call(() => connection?.reducers.joinRoom(), () => finishJoin(new Error("join-refused")));
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
