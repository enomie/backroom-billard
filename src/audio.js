/** Shared Web Audio context and master volume. */
import { MASTER_GAIN } from "./sound-constants.js";

let ctx = null;
let master = null;

/**
 * The audio context, created lazily (browsers only allow sound after a user gesture) and resumed
 * when suspended. Returns null if Web Audio is not available.
 * @returns {AudioContext | null}
 */
export function getAudioContext() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Play an AudioBuffer once through the master gain.
 * @param {AudioBuffer} buffer
 * @param {{ gain?: number, rate?: number, delay?: number }} [options]
 */
export function playBuffer(buffer, { gain = 1, rate = 1, delay = 0 } = {}) {
  const audio = getAudioContext();
  if (!audio || !buffer) return;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const g = audio.createGain();
  g.gain.value = gain;
  source.connect(g);
  g.connect(master);
  source.start(audio.currentTime + delay);
}
