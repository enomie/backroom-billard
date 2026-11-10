/**
 * The database module of Backroom Billard (SpacetimeDB on Maincloud), TypeScript.
 * What it holds and why: _docs/multiplayer.md. The rules (who is dragged to the table, bets, turns,
 * foul, black ball, 10 s timeout) are decided there; this file is the first, small version of it.
 * The module does NOT run any physics: the shooter's browser does, and sends the recording in chunks.
 */
import { schema, table, t, SenderError } from 'spacetimedb/server';

/** Seats: 0 = spectator, 1 and 2 = the two players at the table. */
const SPECTATOR = 0;
const MIN_BID = 10;
const BID_STEP = 10;
const TIMEOUT_MICROS = 10_000_000n; // a player without a sign of life for 10 s has lost
const GAME_WAITING = 0; // no (or one) player: nobody plays without a bid
const GAME_PLAYING = 1;
const BLACK_BALL = 8;

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
      stake: t.u32(), // the challenger's stake of this game
      challenger: t.identity().optional(),
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

  /** The guests of a finished game who want to play again (when both seated players are in here, the next game begins). */
  rematch: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
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
  const game = ctx.db.game.insert({ id: 1, state: GAME_WAITING, turnSeat: 0, shotSeq: 0, shotRunning: false, winnerSeat: 0, reason: '', stake: 0, challenger: undefined });
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

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  const player = ctx.db.player.identity.find(ctx.sender);
  if (player) ctx.db.player.identity.update({ ...player, connected: false });
  ctx.db.presence.identity.delete(ctx.sender); // the face goes away with the guest
  ctx.db.hand.identity.delete(ctx.sender);
  ctx.db.kit.identity.delete(ctx.sender);
  seatTheFirstTwo(ctx); // (does nothing while a game runs: the 10 s of check_timeouts decide then)
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

/** Come into the room (or change the name, the country, the face): there is one room, everybody joins it, as a spectator. */
export const set_profile = spacetimedb.reducer(
  { name: t.string(), country: t.string(), face: t.string(), money: t.u32() },
  (ctx, { name, country, face, money }) => {
    if (!name.trim() || name.length > 80) throw new SenderError('bad name');
    const old = ctx.db.player.identity.find(ctx.sender);
    if (old) {
      ctx.db.player.identity.update({ ...old, name, country, face, connected: true, lastSeen: ctx.timestamp });
    } else {
      // everybody comes in as a spectator (one room for all)
      ctx.db.player.insert({ identity: ctx.sender, name, country, face, money, seat: SPECTATOR, connected: true, lastSeen: ctx.timestamp, joinedAt: ctx.timestamp });
    }
    seatTheFirstTwo(ctx);
  }
);

/**
 * While no game is running, the first two guests present (in the order they came) take the two seats, the
 * first one seat 1; when both seats are taken the game starts by itself. A running game keeps its players.
 */
function seatTheFirstTwo(ctx: Ctx) {
  const game = theGame(ctx);
  if (game.state === GAME_PLAYING) return;
  // guests who are gone are taken out of the list while no game runs (their seats, bids and rows go with them)
  for (const p of [...ctx.db.player.iter()]) {
    if (p.connected) continue;
    ctx.db.player.identity.delete(p.identity);
    ctx.db.bid.bidder.delete(p.identity);
    ctx.db.rematch.identity.delete(p.identity);
    ctx.db.hand.identity.delete(p.identity);
    ctx.db.kit.identity.delete(p.identity);
    ctx.db.presence.identity.delete(p.identity);
  }
  const seatedBefore = [...ctx.db.player.iter()].filter((p) => p.seat !== SPECTATOR && p.connected).length;
  const present = [...ctx.db.player.iter()].filter((p) => p.connected).sort((a, b) => Number(a.joinedAt.microsSinceUnixEpoch - b.joinedAt.microsSinceUnixEpoch));
  const seats = new Map(present.map((p, i) => [p.identity.toHexString(), i < 2 ? i + 1 : SPECTATOR]));
  for (const p of ctx.db.player.iter()) {
    const seat = seats.get(p.identity.toHexString()) ?? SPECTATOR;
    if (p.seat !== seat) ctx.db.player.identity.update({ ...p, seat });
  }
  // fewer than two were sitting: whoever comes now is a new pairing, no "play again" is awaited
  if (seatedBefore < 2 && game.winnerSeat !== 0) ctx.db.game.id.update({ ...game, winnerSeat: 0, reason: '' });
  startIfReady(ctx);
}

/** Both seats are taken and nobody plays yet: the game begins, the first one to join shoots. */
function startIfReady(ctx: Ctx) {
  const game = theGame(ctx);
  const seated = [...ctx.db.player.iter()].filter((p) => p.seat !== SPECTATOR);
  if (game.state === GAME_PLAYING || seated.length < 2 || game.winnerSeat !== 0) return; // (winnerSeat: a finished game waits for "play again")
  resetBalls(ctx);
  ctx.db.game.id.update({ ...game, state: GAME_PLAYING, turnSeat: 1, shotRunning: false, winnerSeat: 0, reason: '' });
}

/** A sign of life (the clients send it every 2 s). */
export const heartbeat = spacetimedb.reducer((ctx) => {
  const player = me(ctx);
  ctx.db.player.identity.update({ ...player, connected: true, lastSeen: ctx.timestamp });
  seatTheFirstTwo(ctx); // (does nothing while a game runs) heals a room that was left in a strange state
});

/** Table bet: raise the own bid (+10, +100 in the client; any multiple of 10, at least 10, at most the money). */
export const place_bid = spacetimedb.reducer({ amount: t.u32() }, (ctx, { amount }) => {
  const player = me(ctx);
  if (player.seat !== SPECTATOR) throw new SenderError('only spectators bid');
  if (amount < MIN_BID || amount % BID_STEP !== 0) throw new SenderError(`a bid is a multiple of ${BID_STEP}, at least ${MIN_BID}`);
  if (amount > player.money) throw new SenderError('not enough money');
  const old = ctx.db.bid.bidder.find(ctx.sender);
  if (old && amount <= old.amount) throw new SenderError('a bid can only be raised (or withdrawn)');
  if (old) ctx.db.bid.bidder.update({ ...old, amount }); // the time of the first bid stays (first come)
  else ctx.db.bid.insert({ bidder: ctx.sender, amount, placedAt: ctx.timestamp });
  fillEmptySeat(ctx);
});

/** Withdraw the bid (not the challenger of the running game: his stake is in the game). */
export const withdraw_bid = spacetimedb.reducer((ctx) => {
  const game = theGame(ctx);
  if (game.challenger && game.challenger.toHexString() === ctx.sender.toHexString() && game.state === GAME_PLAYING) throw new SenderError('the stake of the running game cannot be taken back');
  ctx.db.bid.bidder.delete(ctx.sender);
});

/**
 * Free seats (the table waits) go to the highest bidders, one after the other. With a player already
 * seated, the first bidder challenges him and pays his bid as the stake; with nobody seated he sits down for free.
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
    const champion = seated[0];
    const seat = champion?.seat === 1 ? 2 : 1;
    ctx.db.player.identity.update({ ...bidder, seat, money: bidder.money - (champion ? best.amount : 0) });
    ctx.db.bid.bidder.delete(best.bidder);
    if (champion) ctx.db.game.id.update({ ...game, stake: best.amount, challenger: best.bidder });
    startIfReady(ctx);
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
  }
);

/** The game is over: the winner takes the stake, the loser becomes a spectator, the winner stays (waits for the next bid). */
function finishGame(ctx: Ctx, winnerSeat: number, reason: string) {
  const game = theGame(ctx);
  const players = [...ctx.db.player.iter()];
  const winner = players.find((p) => p.seat === winnerSeat);
  const loser = players.find((p) => p.seat !== SPECTATOR && p.seat !== winnerSeat);
  // the stake goes to the winner: the champion wins it from the challenger, a winning challenger gets his own back
  if (winner) ctx.db.player.identity.update({ ...winner, money: winner.money + game.stake });
  // a loser who is still here (foul, black ball) stays and may play again; one who left or was silent gives up his seat
  if (loser && (reason === 'timeout' || reason === 'left')) ctx.db.player.identity.update({ ...loser, seat: SPECTATOR });
  for (const r of [...ctx.db.rematch.iter()]) ctx.db.rematch.identity.delete(r.identity);
  ctx.db.game.id.update({ ...game, state: GAME_WAITING, shotRunning: false, turnSeat: 0, winnerSeat, reason, stake: 0, challenger: undefined });
  seatTheFirstTwo(ctx); // those who are really here take the seats (a gone player's seat is free); two of them start a game at once if none awaits "play again"
  fillEmptySeat(ctx);
}

/** "Play again" (the button after a game): when both seated players have pressed it, the next game begins, the loser shoots first. */
export const play_again = spacetimedb.reducer((ctx) => {
  const player = me(ctx);
  const game = theGame(ctx);
  if (game.state !== GAME_WAITING || game.winnerSeat === 0 || player.seat === SPECTATOR) throw new SenderError('no finished game to play again');
  if (!ctx.db.rematch.identity.find(ctx.sender)) ctx.db.rematch.insert({ identity: ctx.sender });
  const seated = [...ctx.db.player.iter()].filter((p) => p.seat !== SPECTATOR && p.connected);
  if (seated.length < 2 || !seated.every((p) => ctx.db.rematch.identity.find(p.identity))) return; // the other one has not pressed yet
  for (const r of [...ctx.db.rematch.iter()]) ctx.db.rematch.identity.delete(r.identity);
  resetBalls(ctx);
  ctx.db.game.id.update({ ...game, state: GAME_PLAYING, turnSeat: game.winnerSeat === 1 ? 2 : 1, shotRunning: false, winnerSeat: 0, reason: '', stake: 0, challenger: undefined });
});

/**
 * Anyone can call it (the clients every 2 s): a seated player without a sign of life for 10 s has lost
 * (his stake, if he was the challenger, belongs to the other one).
 */
export const check_timeouts = spacetimedb.reducer((ctx) => {
  const game = theGame(ctx);
  if (game.state !== GAME_PLAYING) return;
  const now = ctx.timestamp.microsSinceUnixEpoch;
  for (const p of ctx.db.player.iter()) {
    if (p.seat === SPECTATOR || now - p.lastSeen.microsSinceUnixEpoch <= TIMEOUT_MICROS) continue;
    finishGame(ctx, p.seat === 1 ? 2 : 1, 'timeout');
    return;
  }
});

/** A player gets up from the table: like a lost game for the challenger, simply free for the champion. */
export const leave_table = spacetimedb.reducer((ctx) => {
  const player = me(ctx);
  const game = theGame(ctx);
  if (player.seat === SPECTATOR) return;
  if (game.state === GAME_PLAYING) finishGame(ctx, player.seat === 1 ? 2 : 1, 'left');
  else ctx.db.player.identity.update({ ...player, seat: SPECTATOR });
});
