/**
 * The database module of Backroom Billard (SpacetimeDB on Maincloud), TypeScript.
 * What it holds and why: _docs/multiplayer.md. The rules (who is dragged to the table, bets, turns,
 * foul, black ball, 10 s timeout) are decided there; this file is the first, small version of it.
 * The module does NOT run any physics: the shooter's browser does, and sends the recording in chunks.
 */
import { schema, table, t, SenderError } from 'spacetimedb/server';

/** Seats: 0 = spectator, 1 and 2 = the two players at the table. */
const SPECTATOR = 0;
const MIN_STAKE = 100; // the least a stake or a table bet can be (whoever has less may put in all he has)
const STAKE_STEP = 10;
const TIMEOUT_MICROS = 10_000_000n; // a player without a sign of life for 10 s has lost
const GAME_WAITING = 0; // no (or one) player: nobody plays without a bid
const GAME_PLAYING = 1;
const GAME_STAKING = 2; // both seats are taken: the two set the stake and press Ready
const BLACK_BALL = 8;
const PIANO_KEY_BYTES = 11; // the 88 keys of the grand piano as bits

const spacetimedb = schema({
  /** Everybody who is in the room (players and spectators). `face` is the JSON of face.js. */
  player: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      name: t.string(),
      country: t.string(),
      face: t.string(),
      money: t.u32(),
      seat: t.u8(),
      connected: t.bool(),
      lastSeen: t.timestamp(),
      joinedAt: t.timestamp(),
    }
  ),

  /** The one game at the table (row id 1). */
  game: table(
    { public: true },
    {
      id: t.u8().primaryKey(),
      state: t.u8(),
      turnSeat: t.u8(), // who shoots (1 or 2); 0 = nobody
      shotSeq: t.u32(), // the number of the last shot
      shotRunning: t.bool(),
      winnerSeat: t.u8(), // 0 = none yet
      reason: t.string(), // 'foul' | 'black-early' | 'black-last' | 'timeout' | 'left' | ''
      stake: t.u32(), // what each of the two put in (the winner of the game takes both); of the last game until the next one begins
    }
  ),

  /** The balls at rest: positions in m (x, z on the table), pocketed or not. Written after every shot. */
  ball: table(
    { public: true },
    {
      id: t.u8().primaryKey(), // 0 = the white ball
      x: t.number(),
      z: t.number(),
      pocketed: t.bool(),
    }
  ),

  /** A shot: what the shooter chose. The cue animation of all clients runs from it. */
  shot: table(
    { public: true },
    {
      seq: t.u32().primaryKey(),
      shooter: t.identity(),
      aimAngle: t.number(),
      power: t.number(),
      nubX: t.number(),
      nubY: t.number(),
      elevation: t.number(),
      error: t.number(), // the random error of the swaying cue, decided by the shooter
      startedAt: t.timestamp(),
    }
  ),

  /** The recording of the running shot in pieces (see multiplayer.md). Deleted when the next shot starts. */
  shotChunk: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      shotSeq: t.u32().index(),
      index: t.u32(), // the number of the piece (from 0)
      data: t.byteArray(), // quantised positions and events, packed by the client
    }
  ),

  /** The aim of the shooter, about 15 times per second (the others see the cue move). */
  aim: table(
    { public: true },
    {
      seat: t.u8().primaryKey(),
      angle: t.number(),
      elevation: t.number(),
      power: t.number(),
      nubX: t.number(),
      nubY: t.number(),
    }
  ),

  /** Where each guest is in the room: the face of the others hangs there (while the free camera is on). About 10 times per second. */
  presence: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      x: t.number(),
      y: t.number(),
      z: t.number(),
      yaw: t.number(),
      pitch: t.number(),
      free: t.bool(), // the free camera is on (otherwise the guest looks along the cue and shows no face)
    }
  ),

  /** Which seat pocketed which ball in this game (for the two lists of the pocketed balls above the table). */
  pocket: table(
    { public: true },
    {
      ballId: t.u8().primaryKey(),
      seat: t.u8(),
    }
  ),

  /** What a guest does with his hands: the R key (drinking) and the T key (smoking) held down, so that the others see it. */
  hand: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      drinking: t.bool(),
      smoking: t.bool(),
    }
  ),

  /** What stands at a guest's seat: the drink (kind and sips left) and the cigarettes (brand and number), so that the others see the same. */
  kit: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      drink: t.string(),
      sips: t.u8(),
      pack: t.u8(),
      packCount: t.u8(),
    }
  ),

  /** The grand piano (row id 1): who sits at it (only one), and which keys are down (88 bits, A0 first), so that the others hear him. */
  piano: table(
    { public: true },
    {
      id: t.u8().primaryKey(),
      sitter: t.identity().optional(),
      keys: t.byteArray(),
    }
  ),

  /** The offers in the stake window of the two seated players, live: the stake is the smaller of the two, the game begins when both are ready. */
  stake: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      amount: t.u32(),
      ready: t.bool(),
    }
  ),

  /** The table bets of the spectators: one bid each (the highest challenges the winner; equal: the first). */
  bid: table(
    { public: true },
    {
      bidder: t.identity().primaryKey(),
      amount: t.u32(),
      placedAt: t.timestamp(),
    }
  ),
});
export default spacetimedb;

type Ctx = Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0];

const me = (ctx: Ctx) => {
  const player = ctx.db.player.identity.find(ctx.sender);
  if (!player) throw new SenderError('not in the room: set_profile first');
  return player;
};

/** The one game at the table. Made on first use (the `init` of a module only runs when its database is created). */
const theGame = (ctx: Ctx) => {
  const found = ctx.db.game.id.find(1);
  if (found) return found;
  const game = ctx.db.game.insert({ id: 1, state: GAME_WAITING, turnSeat: 0, shotSeq: 0, shotRunning: false, winnerSeat: 0, reason: '', stake: 0 });
  resetBalls(ctx);
  return game;
};

/** The first of the bids: the highest, and of equal ones the earliest. */
function topBid(ctx: Ctx, except?: { toHexString(): string }) {
  let best: { bidder: any; amount: number; placedAt: any } | null = null;
  for (const bid of ctx.db.bid.iter()) {
    if (except && bid.bidder.toHexString() === except.toHexString()) continue;
    if (!best || bid.amount > best.amount || (bid.amount === best.amount && bid.placedAt.microsSinceUnixEpoch < best.placedAt.microsSinceUnixEpoch)) best = bid;
  }
  return best;
}

/** The balls of a new rack: all on the table. (The positions come from the client when the first shot ends.) */
function resetBalls(ctx: Ctx) {
  for (let id = 0; id <= 15; id++) {
    const row = { id, x: 0, z: 0, pocketed: false };
    if (ctx.db.ball.id.find(id)) ctx.db.ball.id.update(row);
    else ctx.db.ball.insert(row);
  }
  for (const chunk of [...ctx.db.shotChunk.iter()]) ctx.db.shotChunk.id.delete(chunk.id);
  for (const p of [...ctx.db.pocket.iter()]) ctx.db.pocket.ballId.delete(p.ballId);
}

/** The grand piano. Made on first use. */
const thePiano = (ctx: Ctx) => ctx.db.piano.id.find(1) ?? ctx.db.piano.insert({ id: 1, sitter: undefined, keys: new Uint8Array(PIANO_KEY_BYTES) });

/** Nobody sits at the piano any more (all keys up). */
function freePiano(ctx: Ctx) {
  const piano = thePiano(ctx);
  if (piano.sitter) ctx.db.piano.id.update({ ...piano, sitter: undefined, keys: new Uint8Array(PIANO_KEY_BYTES) });
}

/** Whoever sits at the piano and is up at the table gets up: the shot comes first. */
function standUpIfUp(ctx: Ctx) {
  const game = theGame(ctx);
  const sitter = thePiano(ctx).sitter;
  const player = sitter && ctx.db.player.identity.find(sitter);
  if (player && game.state === GAME_PLAYING && player.seat === game.turnSeat) freePiano(ctx);
}

/** Sit down at the piano: only one at a time, and not for the one who is up at the table. */
export const sit_piano = spacetimedb.reducer((ctx) => {
  const player = me(ctx);
  const game = theGame(ctx);
  if (game.state === GAME_PLAYING && player.seat === game.turnSeat) throw new SenderError('you are up: the table');
  const piano = thePiano(ctx);
  const sitter = piano.sitter && ctx.db.player.identity.find(piano.sitter);
  if (piano.sitter && sitter?.connected && piano.sitter.toHexString() !== ctx.sender.toHexString()) throw new SenderError('somebody sits at the piano');
  ctx.db.piano.id.update({ ...piano, sitter: ctx.sender, keys: new Uint8Array(PIANO_KEY_BYTES) });
});

/** Get up from the piano. */
export const leave_piano = spacetimedb.reducer((ctx) => {
  const piano = thePiano(ctx);
  if (piano.sitter && piano.sitter.toHexString() === ctx.sender.toHexString()) freePiano(ctx);
});

/** The keys that are down now (only from the one who sits there; sent when something changes). */
export const play_keys = spacetimedb.reducer({ keys: t.byteArray() }, (ctx, { keys }) => {
  const piano = thePiano(ctx);
  if (!piano.sitter || piano.sitter.toHexString() !== ctx.sender.toHexString() || keys.length !== PIANO_KEY_BYTES) throw new SenderError('not your piano');
  ctx.db.piano.id.update({ ...piano, keys });
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  const player = ctx.db.player.identity.find(ctx.sender);
  if (player) ctx.db.player.identity.update({ ...player, connected: false });
  const sitter = thePiano(ctx).sitter;
  if (sitter && sitter.toHexString() === ctx.sender.toHexString()) freePiano(ctx);
  ctx.db.presence.identity.delete(ctx.sender); // the face goes away with the guest
  ctx.db.hand.identity.delete(ctx.sender);
  ctx.db.kit.identity.delete(ctx.sender);
  seatTheFirstTwo(ctx); // (does nothing while a game runs: the 10 s of check_timeouts decide then)
});

/** The money of the guest changed (a drink, a pack): the others see it under his name. */
export const set_money = spacetimedb.reducer({ money: t.u32() }, (ctx, { money }) => {
  const player = me(ctx);
  ctx.db.player.identity.update({ ...player, money });
});

/** The drink and the cigarettes of the guest changed (a sip, a new order, a cigarette): only a change is sent. */
export const set_kit = spacetimedb.reducer({ drink: t.string(), sips: t.u8(), pack: t.u8(), packCount: t.u8() }, (ctx, k) => {
  me(ctx);
  const row = { identity: ctx.sender, ...k };
  if (ctx.db.kit.identity.find(ctx.sender)) ctx.db.kit.identity.update(row);
  else ctx.db.kit.insert(row);
});

/** The R key and the T key of the guest went down or up (drinking, smoking). */
export const set_hand = spacetimedb.reducer({ drinking: t.bool(), smoking: t.bool() }, (ctx, h) => {
  me(ctx);
  const row = { identity: ctx.sender, ...h };
  if (ctx.db.hand.identity.find(ctx.sender)) ctx.db.hand.identity.update(row);
  else ctx.db.hand.insert(row);
});

/** Where the guest is (position and view of the camera), about 10 times per second. */
export const set_presence = spacetimedb.reducer(
  { x: t.number(), y: t.number(), z: t.number(), yaw: t.number(), pitch: t.number(), free: t.bool() },
  (ctx, p) => {
    me(ctx);
    const row = { identity: ctx.sender, ...p };
    if (ctx.db.presence.identity.find(ctx.sender)) ctx.db.presence.identity.update(row);
    else ctx.db.presence.insert(row);
  }
);

/**
 * The profile comes from a browser that may be changed by hand: only what the welcome screen can produce is accepted. The name
 * is "First M. Last" (parts of letters, dots and hyphens, at most 10 letters each, the initials of the middle name up to 14), the country a
 * two-letter code, the face a small JSON object.
 */
function checkProfile(name: string, country: string, face: string) {
  const parts = name.split(' ');
  const partOk = (part: string) => /^\p{L}[\p{L}.-]*$/u.test(part) && part.length <= 14;
  if (name.length > 40 || parts.length < 2 || parts.length > 3 || !parts.every(partOk)) throw new SenderError('bad name');
  if (!/^[a-z]{2}$/.test(country)) throw new SenderError('bad country');
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(face);
  } catch {
    /* not JSON */
  }
  if (face.length > 600 || !parsed || typeof parsed !== 'object') throw new SenderError('bad face');
}

/** Come into the room (or change the name, the country, the face): there is one room, everybody joins it, as a spectator. */
export const set_profile = spacetimedb.reducer(
  { name: t.string(), country: t.string(), face: t.string(), money: t.u32() },
  (ctx, { name, country, face, money }) => {
    checkProfile(name, country, face);
    const old = ctx.db.player.identity.find(ctx.sender);
    if (old) {
      ctx.db.player.identity.update({ ...old, name, country, face, connected: true, lastSeen: ctx.timestamp });
    } else {
      // everybody comes in as a spectator (one room for all)
      ctx.db.player.insert({ identity: ctx.sender, name, country, face, money, seat: SPECTATOR, connected: true, lastSeen: ctx.timestamp, joinedAt: ctx.timestamp });
    }
    sweep(ctx); // (ghosts of earlier visits go at once, not after their 10 s)
  }
);

/** A guest who is gone: the connection is closed, or no sign of life for 10 s (a closed tab, a crash, a module that was published anew). */
const isGone = (ctx: Ctx, p: { connected: boolean; lastSeen: { microsSinceUnixEpoch: bigint } }) =>
  !p.connected || ctx.timestamp.microsSinceUnixEpoch - p.lastSeen.microsSinceUnixEpoch > TIMEOUT_MICROS;

/** A guest leaves the room for good: all his rows go (his seat, bid, offer, keys held at the piano). */
function dropGuest(ctx: Ctx, identity: Parameters<typeof ctx.db.player.identity.delete>[0]) {
  ctx.db.player.identity.delete(identity);
  ctx.db.bid.bidder.delete(identity);
  ctx.db.stake.identity.delete(identity);
  ctx.db.hand.identity.delete(identity);
  ctx.db.kit.identity.delete(identity);
  ctx.db.presence.identity.delete(identity);
  const piano = thePiano(ctx);
  if (piano.sitter && piano.sitter.toHexString() === identity.toHexString()) freePiano(ctx);
}

/**
 * While no game is running: guests who are gone are taken out of the list, and free seats go to the guests present in the
 * order they came (the first one to seat 1). Whoever sits keeps his seat. When both seats are taken the stake window opens.
 * (With a player waiting at the table, a free seat goes to the highest table bet first: see fillEmptySeat.)
 */
function seatTheFirstTwo(ctx: Ctx) {
  const game = theGame(ctx);
  if (game.state === GAME_PLAYING) return;
  for (const p of [...ctx.db.player.iter()]) if (isGone(ctx, p)) dropGuest(ctx, p.identity);
  const seatedBefore = [...ctx.db.player.iter()].filter((p) => p.seat !== SPECTATOR).length;
  const free = [1, 2].filter((seat) => ![...ctx.db.player.iter()].some((p) => p.seat === seat));
  const waiting = [...ctx.db.player.iter()].filter((p) => p.seat === SPECTATOR).sort((a, b) => Number(a.joinedAt.microsSinceUnixEpoch - b.joinedAt.microsSinceUnixEpoch));
  free.forEach((seat, i) => {
    if (waiting[i]) ctx.db.player.identity.update({ ...waiting[i], seat });
  });
  // fewer than two were sitting: whoever comes now is a new pairing, the first one to join shoots first
  if (seatedBefore < 2 && game.winnerSeat !== 0) ctx.db.game.id.update({ ...game, winnerSeat: 0, reason: '' });
  syncStaking(ctx);
}

/** Nobody plays: with two at the table the stake window is open (their offers in `stake`), otherwise the table waits. */
function syncStaking(ctx: Ctx) {
  const game = theGame(ctx);
  if (game.state === GAME_PLAYING) return;
  const seated = [...ctx.db.player.iter()].filter((p) => p.seat !== SPECTATOR);
  const ids = new Set(seated.map((p) => p.identity.toHexString()));
  for (const row of [...ctx.db.stake.iter()]) if (!ids.has(row.identity.toHexString())) ctx.db.stake.identity.delete(row.identity);
  if (seated.length < 2) {
    if (game.state === GAME_STAKING) ctx.db.game.id.update({ ...game, state: GAME_WAITING });
    return;
  }
  let fresh = game.state === GAME_WAITING; // a new window: nobody is ready yet
  for (const p of seated) {
    const row = ctx.db.stake.identity.find(p.identity);
    if (!row) {
      ctx.db.stake.insert({ identity: p.identity, amount: Math.min(MIN_STAKE, p.money), ready: false });
      fresh = true;
    } else if (game.state === GAME_WAITING && row.amount > p.money) ctx.db.stake.identity.update({ ...row, amount: p.money }); // (the offer never stands above the money)
  }
  if (game.state === GAME_WAITING) ctx.db.game.id.update({ ...game, state: GAME_STAKING });
  if (fresh) for (const row of [...ctx.db.stake.iter()]) if (row.ready) ctx.db.stake.identity.update({ ...row, ready: false });
}

/** What each of the two puts in: the smaller of the two offers (and never more than the money of either). */
function agreedStake(ctx: Ctx) {
  const seated = [...ctx.db.player.iter()].filter((p) => p.seat !== SPECTATOR);
  return Math.min(...seated.map((p) => Math.min(p.money, ctx.db.stake.identity.find(p.identity)?.amount ?? 0)));
}

/** A stake or a bet: a multiple of 10, at least 100 (or all the money, if that is less), at most the money. */
const validAmount = (amount: number, money: number) => amount <= money && amount >= Math.min(MIN_STAKE, money) && (amount % STAKE_STEP === 0 || amount === money);

/** The stake window: the own offer changes (live for the other one). When the agreed stake changes, both have to press Ready again. */
export const set_stake = spacetimedb.reducer({ amount: t.u32() }, (ctx, { amount }) => {
  const player = me(ctx);
  const row = ctx.db.stake.identity.find(ctx.sender);
  if (theGame(ctx).state !== GAME_STAKING || !row) throw new SenderError('no stake window open for you');
  if (!validAmount(amount, player.money)) throw new SenderError(`a stake is a multiple of ${STAKE_STEP}, at least ${MIN_STAKE}, at most your money`);
  const before = agreedStake(ctx);
  ctx.db.stake.identity.update({ ...row, amount });
  if (agreedStake(ctx) === before) return;
  for (const r of [...ctx.db.stake.iter()]) if (r.ready) ctx.db.stake.identity.update({ ...r, ready: false });
});

/** Ready (or not any more): when both are ready the game begins, both stakes are in. */
export const set_ready = spacetimedb.reducer({ ready: t.bool() }, (ctx, { ready }) => {
  const row = ctx.db.stake.identity.find(ctx.sender);
  if (theGame(ctx).state !== GAME_STAKING || !row) throw new SenderError('no stake window open for you');
  ctx.db.stake.identity.update({ ...row, ready });
  const rows = [...ctx.db.stake.iter()];
  if (rows.length < 2 || !rows.every((r) => r.ready)) return;
  const game = theGame(ctx);
  resetBalls(ctx);
  // (the clients pay their stake when the game begins, and the winner's client takes both at the end)
  ctx.db.game.id.update({ ...game, state: GAME_PLAYING, turnSeat: game.winnerSeat === 1 ? 2 : 1, shotRunning: false, winnerSeat: 0, reason: '', stake: agreedStake(ctx) });
  for (const r of rows) ctx.db.stake.identity.update({ ...r, ready: false });
  standUpIfUp(ctx);
});

/** A sign of life (the clients send it every 2 s). */
export const heartbeat = spacetimedb.reducer((ctx) => {
  const player = me(ctx);
  ctx.db.player.identity.update({ ...player, connected: true, lastSeen: ctx.timestamp });
  seatTheFirstTwo(ctx); // (does nothing while a game runs) heals a room that was left in a strange state
});

/** Table bet (spectators): the own bid is set (a multiple of 10, at least 100, at most the money; all the money if that is less than 100). */
export const place_bid = spacetimedb.reducer({ amount: t.u32() }, (ctx, { amount }) => {
  const player = me(ctx);
  if (player.seat !== SPECTATOR) throw new SenderError('only spectators bid');
  if (!validAmount(amount, player.money)) throw new SenderError(`a bid is a multiple of ${STAKE_STEP}, at least ${MIN_STAKE}, at most your money`);
  const old = ctx.db.bid.bidder.find(ctx.sender);
  if (old) ctx.db.bid.bidder.update({ ...old, amount }); // the time of the first bid stays (first come)
  else ctx.db.bid.insert({ bidder: ctx.sender, amount, placedAt: ctx.timestamp });
  fillEmptySeat(ctx);
});

/** Withdraw the bid. */
export const withdraw_bid = spacetimedb.reducer((ctx) => {
  ctx.db.bid.bidder.delete(ctx.sender);
});

/**
 * A free seat (nobody plays) goes to the highest bidder. With a player waiting at the table, the bidder challenges him: the
 * stake window opens with the bid as his offer. With nobody seated he sits down alone.
 */
function fillEmptySeat(ctx: Ctx) {
  for (;;) {
    const game = theGame(ctx);
    if (game.state === GAME_PLAYING) return;
    const seated = [...ctx.db.player.iter()].filter((p) => p.seat !== SPECTATOR);
    if (seated.length >= 2) return;
    const best = topBid(ctx);
    const bidder = best && ctx.db.player.identity.find(best.bidder);
    if (!best || !bidder) return;
    ctx.db.player.identity.update({ ...bidder, seat: seated[0]?.seat === 1 ? 2 : 1 });
    ctx.db.bid.bidder.delete(best.bidder);
    const row = { identity: best.bidder, amount: Math.min(best.amount, bidder.money), ready: false };
    if (ctx.db.stake.identity.find(best.bidder)) ctx.db.stake.identity.update(row);
    else ctx.db.stake.insert(row);
    syncStaking(ctx);
  }
}

/** The aim of the shooter (about 15 times per second; the others see the cue move). */
export const set_aim = spacetimedb.reducer(
  { angle: t.number(), elevation: t.number(), power: t.number(), nubX: t.number(), nubY: t.number() },
  (ctx, a) => {
    const player = me(ctx);
    if (player.seat === SPECTATOR) return;
    const row = { seat: player.seat, ...a };
    if (ctx.db.aim.seat.find(player.seat)) ctx.db.aim.seat.update(row);
    else ctx.db.aim.insert(row);
  }
);

/** SHOOT: only the one whose turn it is, and only when no shot is running. */
export const take_shot = spacetimedb.reducer(
  { aimAngle: t.number(), power: t.number(), nubX: t.number(), nubY: t.number(), elevation: t.number(), error: t.number() },
  (ctx, s) => {
    const player = me(ctx);
    const game = theGame(ctx);
    if (game.state !== GAME_PLAYING || game.shotRunning || player.seat !== game.turnSeat) throw new SenderError('not your shot');
    const seq = game.shotSeq + 1;
    for (const chunk of [...ctx.db.shotChunk.iter()]) ctx.db.shotChunk.id.delete(chunk.id); // the pieces of the last shot are not needed any more
    ctx.db.shot.insert({ seq, shooter: ctx.sender, startedAt: ctx.timestamp, ...s });
    ctx.db.game.id.update({ ...game, shotSeq: seq, shotRunning: true });
  }
);

/** A piece of the recording of the running shot (from the shooter only). */
export const push_chunk = spacetimedb.reducer({ shotSeq: t.u32(), index: t.u32(), data: t.byteArray() }, (ctx, { shotSeq, index, data }) => {
  const game = theGame(ctx);
  const shot = ctx.db.shot.seq.find(shotSeq);
  if (!shot || shot.shooter.toHexString() !== ctx.sender.toHexString() || shotSeq !== game.shotSeq) throw new SenderError('not the running shot of yours');
  ctx.db.shotChunk.insert({ id: 0n, shotSeq, index, data });
});

/**
 * The shot is over (everything lies still): the rest positions and what happened. The rules are applied here:
 * foul = the shooter loses; the black ball too early = the shooter loses, as the last one = he wins;
 * a pocketed ball and no white ball pocketed = shoots again; otherwise the other one.
 */
export const end_shot = spacetimedb.reducer(
  {
    shotSeq: t.u32(),
    foul: t.bool(),
    whiteGone: t.bool(), // pocketed or shot off the table
    pocketed: t.array(t.u8()), // the ids of the balls pocketed in this shot (without the white one)
    restIds: t.array(t.u8()),
    restX: t.array(t.number()),
    restZ: t.array(t.number()),
  },
  (ctx, r) => {
    const game = theGame(ctx);
    const shot = ctx.db.shot.seq.find(r.shotSeq);
    if (!shot || shot.shooter.toHexString() !== ctx.sender.toHexString() || !game.shotRunning || r.shotSeq !== game.shotSeq) throw new SenderError('not the running shot of yours');
    const shooter = me(ctx);
    // the balls: pocketed ones are gone, the others are where they lie
    for (const id of r.pocketed) {
      const b = ctx.db.ball.id.find(id);
      if (b) ctx.db.ball.id.update({ ...b, pocketed: true });
      if (!ctx.db.pocket.ballId.find(id)) ctx.db.pocket.insert({ ballId: id, seat: shooter.seat }); // the shooter pocketed it
    }
    r.restIds.forEach((id, i) => {
      const b = ctx.db.ball.id.find(id);
      if (b && !b.pocketed) ctx.db.ball.id.update({ ...b, x: r.restX[i], z: r.restZ[i] });
    });
    let winnerSeat = 0;
    let reason = '';
    const others = shooter.seat === 1 ? 2 : 1;
    if (r.foul) [winnerSeat, reason] = [others, 'foul'];
    else if (r.pocketed.includes(BLACK_BALL)) {
      const colouredLeft = [...ctx.db.ball.iter()].some((b) => b.id !== 0 && b.id !== BLACK_BALL && !b.pocketed);
      [winnerSeat, reason] = colouredLeft ? [others, 'black-early'] : [shooter.seat, 'black-last'];
    }
    if (winnerSeat) return finishGame(ctx, winnerSeat, reason);
    const again = r.pocketed.length > 0 && !r.whiteGone;
    ctx.db.game.id.update({ ...game, shotRunning: false, turnSeat: again ? shooter.seat : others });
    standUpIfUp(ctx);
  }
);

/**
 * The game is over (the winner's client takes the stakes). The winner stays; the loser gives up his seat when a spectator has
 * bet on the table, or when he left or fell silent. Otherwise both stay and the stake window opens again.
 */
function finishGame(ctx: Ctx, winnerSeat: number, reason: string) {
  const game = theGame(ctx);
  const players = [...ctx.db.player.iter()];
  const loser = players.find((p) => p.seat !== SPECTATOR && p.seat !== winnerSeat);
  if (loser && (reason === 'timeout' || reason === 'left' || topBid(ctx))) ctx.db.player.identity.update({ ...loser, seat: SPECTATOR });
  ctx.db.game.id.update({ ...game, state: GAME_WAITING, shotRunning: false, turnSeat: 0, winnerSeat, reason });
  fillEmptySeat(ctx); // the highest bidder challenges the winner
  seatTheFirstTwo(ctx); // anybody else present takes a free seat; two at the table open the stake window
}

/**
 * Clears out the room: a guest without a sign of life for 10 s is gone (spectators and players, a closed connection counts at once for
 * spectators). A player of a running game who is silent has lost (the other one takes both stakes); otherwise the gone ones are taken
 * out and free seats are filled (seatTheFirstTwo). Runs with every join and from the clients every 2 s (anybody may ask).
 */
function sweep(ctx: Ctx) {
  const game = theGame(ctx);
  for (const p of [...ctx.db.player.iter()]) if (p.seat === SPECTATOR && isGone(ctx, p)) dropGuest(ctx, p.identity);
  if (game.state === GAME_PLAYING) {
    const silent = [...ctx.db.player.iter()].find((p) => p.seat !== SPECTATOR && ctx.timestamp.microsSinceUnixEpoch - p.lastSeen.microsSinceUnixEpoch > TIMEOUT_MICROS);
    if (silent) finishGame(ctx, silent.seat === 1 ? 2 : 1, 'timeout');
    return;
  }
  seatTheFirstTwo(ctx);
}
export const check_timeouts = spacetimedb.reducer((ctx) => sweep(ctx));

/** A player gets up from the table: a lost game while it runs, otherwise his seat is simply free. */
export const leave_table = spacetimedb.reducer((ctx) => {
  const player = me(ctx);
  const game = theGame(ctx);
  if (player.seat === SPECTATOR) return;
  if (game.state === GAME_PLAYING) finishGame(ctx, player.seat === 1 ? 2 : 1, 'left');
  else {
    ctx.db.player.identity.update({ ...player, seat: SPECTATOR });
    syncStaking(ctx);
  }
});
