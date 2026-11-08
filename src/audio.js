/** Shared Web Audio context and master volume. */
import {
  MASTER_GAIN,
  COLLISION_MIN_SPEED,
  COLLISION_MAX_SPEED,
  COLLISION_COOLDOWN,
  COLLISION_MAX_VOICES,
  COLLISION_VOICE_WINDOW,
  SOUND_REF_DISTANCE,
  SOUND_ROLLOFF,
} from "./sound-constants.js";

let ctx = null;
let master = null;

/**
 * Sound is allowed once the player has confirmed on the start screen: that click is the gesture the
 * browsers want. The radio starts from it (and not from any other key or click).
 */
let unlocked = false;
const unlockListeners = new Set();

/** Call from the click on the start screen's button. */
export function unlockAudio() {
  unlocked = true;
  getAudioContext(); // created and woken up inside the gesture
  unlockListeners.forEach((fn) => fn());
  unlockListeners.clear();
}

/** Run `fn` when the sound is unlocked (at once if it already is). */
export function onAudioUnlock(fn) {
  if (unlocked) fn();
  else unlockListeners.add(fn);
}

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
 * A panner at a world position (equal-power panning, gentle distance falloff).
 * @param {AudioContext} audio
 * @param {[number, number, number]} position
 */
export function createSoundPanner(audio, position) {
  const panner = audio.createPanner();
  panner.panningModel = "equalpower";
  panner.distanceModel = "inverse";
  panner.refDistance = SOUND_REF_DISTANCE;
  panner.rolloffFactor = SOUND_ROLLOFF;
  setPannerPosition(panner, position);
  return panner;
}

/** Move a panner (Safari without AudioParam positions uses setPosition). */
export function setPannerPosition(panner, [x, y, z]) {
  if (panner.positionX) {
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
  } else {
    panner.setPosition(x, y, z);
  }
}

const lastListener = new Float32Array(16).fill(NaN);

/** The listener (ears) follows the camera. Call once per frame; the audio parameters are set only when the camera moved. */
export function updateAudioListener(camera) {
  if (!ctx) return;
  const l = ctx.listener;
  if (!l.positionX) return;
  camera.updateMatrixWorld();
  const e = camera.matrixWorld.elements;
  let same = true;
  for (let i = 0; i < 15 && same; i++) same = e[i] === lastListener[i]; // rotation and position
  if (same) return;
  lastListener.set(e);
  // the camera looks along its local −z, up is its local +y
  l.positionX.value = e[12];
  l.positionY.value = e[13];
  l.positionZ.value = e[14];
  l.forwardX.value = -e[8];
  l.forwardY.value = -e[9];
  l.forwardZ.value = -e[10];
  l.upX.value = e[4];
  l.upY.value = e[5];
  l.upZ.value = e[6];
}

/**
 * Play an AudioBuffer once through the master gain, from a world position if given.
 * @param {AudioBuffer} buffer
 * @param {{ gain?: number, rate?: number, delay?: number, position?: [number, number, number] }} [options]
 */
export function playBuffer(buffer, { gain = 1, rate = 1, delay = 0, position } = {}) {
  const audio = getAudioContext();
  if (!audio || !buffer) return;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const g = audio.createGain();
  g.gain.value = gain;
  source.connect(g);
  if (position) {
    const panner = createSoundPanner(audio, position);
    g.connect(panner);
    panner.connect(master);
  } else {
    g.connect(master);
  }
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
