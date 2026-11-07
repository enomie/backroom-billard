/** Shared Web Audio context and master volume. */
import {
  MASTER_GAIN,
  COLLISION_MIN_SPEED,
  COLLISION_MAX_SPEED,
  COLLISION_COOLDOWN,
  COLLISION_MAX_VOICES,
  COLLISION_VOICE_WINDOW,
} from "./sound-constants.js";

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

/** The master gain node (null until the audio context exists). */
export function getMasterNode() {
  return master;
}

/** Recent play times for the voice limit and per-source cooldowns. */
const recent = [];
const lastBySource = new Map();

/**
 * Debounce for impact sounds: the same source is silent for COLLISION_COOLDOWN, and at most
 * COLLISION_MAX_VOICES sounds start within COLLISION_VOICE_WINDOW.
 * @param {string} sourceKey
 */
export function allowSound(sourceKey) {
  const now = performance.now() / 1000;
  if (now - (lastBySource.get(sourceKey) ?? -1) < COLLISION_COOLDOWN) return false;
  while (recent.length && now - recent[0] > COLLISION_VOICE_WINDOW) recent.shift();
  if (recent.length >= COLLISION_MAX_VOICES) return false;
  lastBySource.set(sourceKey, now);
  recent.push(now);
  return true;
}

/** 0 … 1 from an impact speed (m/s), or -1 if too soft to be heard. */
export function impactStrength(speed) {
  return speed < COLLISION_MIN_SPEED ? -1 : Math.min(1, speed / COLLISION_MAX_SPEED);
}
