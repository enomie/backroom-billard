/**
 * Recording a shot and playing it back: the shooter's game writes down, every frame, where the balls are
 * and how the cue moves, and sends it in small pieces; the other guests collect the pieces and play them
 * back a little later (a buffer), smoothly. Frames are plain numbers in a Float32Array. See _docs/multiplayer.md.
 *
 * One frame: [time (ms since the shot began), cue angle, cue pitch, cue nub x, cue nub y, cue gap, number of balls,
 * then per ball: id, x, y, z, qx, qy, qz, qw].
 */
import { REPLAY_CHUNK_MS, REPLAY_DELAY_MS } from "./multiplayer-constants.js";

const HEAD = 7;
const PER_BALL = 8;

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
     * @param {{ angle: number, pitch: number, x: number, y: number, gap: number }} cue
     * @param {{ id: number, mesh: { position: { x: number, y: number, z: number }, quaternion: { x: number, y: number, z: number, w: number } } }[]} balls
     */
    frame(now, cue, balls) {
      const f = new Float32Array(HEAD + balls.length * PER_BALL);
      f.set([now - startedAt, cue.angle, cue.pitch, cue.x, cue.y, cue.gap, balls.length]);
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
    /** The shot is over: the last piece. */
    finish() {
      flush();
    },
  };
}

/** The pieces of a recording → frames. */
function decode(bytes) {
  // (a copy: the bytes may sit at an odd offset of a larger buffer)
  const floats = new Float32Array(bytes.slice().buffer);
  const frames = [];
  let at = 0;
  while (at < floats.length) {
    const size = HEAD + floats[at + 6] * PER_BALL;
    frames.push(floats.subarray(at, at + size));
    at += size;
  }
  return frames;
}

const lerp = (a, b, k) => a + (b - a) * k;
const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

/** The playback of the others: collects the pieces, plays them back `REPLAY_DELAY_MS` after the first arrived. */
export function createShotReplay() {
  let chunks = new Map(); // index → frames
  let frames = []; // all frames in order
  let nextIndex = 0; // the next piece that is appended
  let wall0 = 0; // when the first frame is shown (ms, performance.now)
  let t0 = 0; // the time of the first frame
  let active = false;

  const append = () => {
    while (chunks.has(nextIndex)) {
      frames.push(...chunks.get(nextIndex));
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
     * @returns {{ cue: object, balls: Map<number, object>, done: boolean } | null} null while nothing has arrived
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
      const cue = { angle: lerpAngle(a[1], b[1], k), pitch: lerp(a[2], b[2], k), x: lerp(a[3], b[3], k), y: lerp(a[4], b[4], k), gap: lerp(a[5], b[5], k) };
      const read = (f) => {
        const map = new Map();
        for (let n = 0; n < f[6]; n++) {
          const o = HEAD + n * PER_BALL;
          map.set(f[o], f.subarray(o + 1, o + PER_BALL));
        }
        return map;
      };
      const ballsA = read(a);
      const ballsB = a === b ? ballsA : read(b);
      const balls = new Map();
      for (const [id, pa] of ballsA) {
        const pb = ballsB.get(id) ?? pa; // gone in the next frame: it stays where it was until then
        balls.set(id, { x: lerp(pa[0], pb[0], k), y: lerp(pa[1], pb[1], k), z: lerp(pa[2], pb[2], k), q: [pa.slice(3, 7), pb.slice(3, 7), k] });
      }
      return { cue, balls, done };
    },
    /** The playback is over (or the shot was not shown): nothing is kept. */
    end() {
      active = false;
      chunks = new Map();
      frames = [];
    },
  };
}
