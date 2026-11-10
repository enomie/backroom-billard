/**
 * Recording a shot and playing it back: the shooter's game writes down, every frame, where the balls are
 * and how the cue moves, and sends it in small pieces; the other guests collect the pieces and play them
 * back a little later (a buffer), smoothly. Frames are plain numbers in a Float32Array. See _docs/multiplayer.md.
 *
 * One frame: [time (ms since the shot began), cue angle, cue pitch, cue nub x, cue nub y, cue gap, cue relax (0 = at the ball,
 * 1 = carried at the shooter's head), the place of the cue (x, y, z), number of balls, then per ball: id, x, y, z, qx, qy, qz, qw].
 * One sound event (the clack of two balls, a cushion, a pocket, the cue): [time, kind, p1, x, y, z, p2, 0, 0, 0, −1]; the −1
 * in the place of the number of balls tells it from a frame.
 */
import { REPLAY_CHUNK_MS, REPLAY_DELAY_MS } from "./multiplayer-constants.js";
import { TABLE_H } from "./table-constants.js";

const COUNT_AT = 10; // where the number of balls (or the −1 of a sound event) stands
const HEAD = 11;
const PER_BALL = 8;
const EVENT_SIZE = HEAD;

/**
 * The recorder of the shooter.
 * @param {(index: number, bytes: Uint8Array) => void} send — a piece of the recording
 */
export function createShotRecorder(send) {
  let frames = [];
  let startedAt = 0;
  let lastFlush = 0;
  let index = 0;

  const flush = () => {
    if (!frames.length) return;
    const floats = new Float32Array(frames.reduce((n, f) => n + f.length, 0));
    let at = 0;
    for (const f of frames) {
      floats.set(f, at);
      at += f.length;
    }
    send(index++, new Uint8Array(floats.buffer));
    frames = [];
  };

  return {
    /** The shot begins. */
    start(now) {
      frames = [];
      index = 0;
      startedAt = lastFlush = now;
    },
    /**
     * One frame.
     * @param {number} now — ms
     * @param {{ angle: number, pitch: number, x: number, y: number, gap: number, relax: number, place: { x: number, y: number, z: number } }} cue
     * @param {{ id: number, mesh: { position: { x: number, y: number, z: number }, quaternion: { x: number, y: number, z: number, w: number } } }[]} balls
     */
    frame(now, cue, balls) {
      const f = new Float32Array(HEAD + balls.length * PER_BALL);
      f.set([now - startedAt, cue.angle, cue.pitch, cue.x, cue.y, cue.gap, cue.relax, cue.place.x, cue.place.y, cue.place.z, balls.length]);
      balls.forEach((b, i) => {
        const p = b.mesh.position;
        const q = b.mesh.quaternion;
        f.set([b.id, p.x, p.y, p.z, q.x, q.y, q.z, q.w], HEAD + i * PER_BALL);
      });
      frames.push(f);
      if (now - lastFlush >= REPLAY_CHUNK_MS) {
        lastFlush = now;
        flush();
      }
    },
    /** A sound of the shot (see EVENT_SIZE): what kind, two numbers and where it was heard. */
    event(now, kind, p1, p2, position) {
      const f = new Float32Array(EVENT_SIZE);
      f.set([now - startedAt, kind, p1, position[0], position[1], position[2], p2, 0, 0, 0, -1]);
      frames.push(f);
    },
    /** The shot is over: the last piece. */
    finish() {
      flush();
    },
  };
}

/** The pieces of a recording → frames and sound events. */
function decode(bytes) {
  // (a copy: the bytes may sit at an odd offset of a larger buffer)
  const floats = new Float32Array(bytes.slice().buffer);
  const frames = [];
  const events = [];
  let at = 0;
  while (at < floats.length) {
    if (floats[at + COUNT_AT] < 0) {
      events.push({ t: floats[at], kind: floats[at + 1], p1: floats[at + 2], p2: floats[at + 6], position: [floats[at + 3], floats[at + 4], floats[at + 5]] });
      at += EVENT_SIZE;
      continue;
    }
    const size = HEAD + floats[at + COUNT_AT] * PER_BALL;
    frames.push(floats.subarray(at, at + size));
    at += size;
  }
  return { frames, events };
}

const lerp = (a, b, k) => a + (b - a) * k;
const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

/** The playback of the others: collects the pieces, plays them back `REPLAY_DELAY_MS` after the first arrived. */
export function createShotReplay() {
  let chunks = new Map(); // index → { frames, events }
  let frames = []; // all frames in order
  let events = []; // all sound events in order
  let eventIndex = 0; // the next sound event to be played
  let nextIndex = 0; // the next piece that is appended
  let wall0 = 0; // when the first frame is shown (ms, performance.now)
  let t0 = 0; // the time of the first frame
  let active = false;

  const append = () => {
    while (chunks.has(nextIndex)) {
      const piece = chunks.get(nextIndex);
      frames.push(...piece.frames);
      events.push(...piece.events);
      chunks.delete(nextIndex++);
    }
  };

  return {
    get active() {
      return active;
    },
    /** A shot of somebody else begins. */
    begin() {
      chunks = new Map();
      frames = [];
      events = [];
      eventIndex = 0;
      nextIndex = 0;
      active = true;
      wall0 = 0;
    },
    /** A piece of the recording arrived (pieces can arrive in any order). */
    add(index, bytes, now) {
      if (!active) return;
      chunks.set(index, decode(bytes));
      append();
      if (!wall0 && frames.length) {
        t0 = frames[0][0];
        wall0 = now + REPLAY_DELAY_MS;
      }
    },
    /**
     * The picture for `now`: the cue and the balls (interpolated), `done` when the end of what has arrived is reached.
     * `sounds` are the sound events whose time has come (once each); `rolling` the balls that roll on the table (speed, place).
     * @returns {{ cue: object, balls: Map<number, object>, sounds: object[], rolling: object[], done: boolean } | null} null while nothing has arrived
     */
    sample(now) {
      if (!active || !frames.length) return null;
      const t = t0 + Math.max(0, now - wall0);
      let i = 0;
      while (i + 1 < frames.length && frames[i + 1][0] <= t) i++;
      const a = frames[i];
      const b = frames[Math.min(i + 1, frames.length - 1)];
      const done = i + 1 >= frames.length && t >= a[0];
      const k = a === b ? 0 : Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0] || 1)));
      const cue = {
        angle: lerpAngle(a[1], b[1], k),
        pitch: lerp(a[2], b[2], k),
        x: lerp(a[3], b[3], k),
        y: lerp(a[4], b[4], k),
        gap: lerp(a[5], b[5], k),
        relax: lerp(a[6], b[6], k),
        place: { x: lerp(a[7], b[7], k), y: lerp(a[8], b[8], k), z: lerp(a[9], b[9], k) },
      };
      const read = (f) => {
        const map = new Map();
        for (let n = 0; n < f[COUNT_AT]; n++) {
          const o = HEAD + n * PER_BALL;
          map.set(f[o], f.subarray(o + 1, o + PER_BALL));
        }
        return map;
      };
      const ballsA = read(a);
      const ballsB = a === b ? ballsA : read(b);
      const balls = new Map();
      const rolling = [];
      const seconds = (b[0] - a[0]) / 1000;
      for (const [id, pa] of ballsA) {
        const pb = ballsB.get(id) ?? pa; // gone in the next frame: it stays where it was until then
        const ball = { x: lerp(pa[0], pb[0], k), y: lerp(pa[1], pb[1], k), z: lerp(pa[2], pb[2], k), q: [pa.slice(3, 7), pb.slice(3, 7), k] };
        balls.set(id, ball);
        const speed = seconds > 0 ? Math.hypot(pb[0] - pa[0], pb[2] - pa[2]) / seconds : 0; // the speed of the replay's ball (for the rolling sound)
        if (ball.y > TABLE_H - 0.01 && speed > 0.03) rolling.push({ speed, position: [ball.x, ball.y, ball.z] });
      }
      const sounds = [];
      while (eventIndex < events.length && events[eventIndex].t <= t) sounds.push(events[eventIndex++]);
      return { cue, balls, sounds, rolling, done };
    },
    /** The playback is over (or the shot was not shown): nothing is kept. */
    end() {
      active = false;
      chunks = new Map();
      frames = [];
      events = [];
    },
  };
}
