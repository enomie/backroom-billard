/**
 * Sounds of smoking: the drag on the cigarette (a soft intake that rises while the key is held,
 * with the crackle of the glowing tobacco) and the exhale, longer after a longer drag.
 * All generated; the sound comes from the player himself, so it is not positioned.
 */
import { getAudioContext, getMasterNode, playBuffer } from "./audio.js";
import { bandpass, finish } from "./synth-utils.js";
import { lerp } from "./math-utils.js";
import {
  DRAG_GAIN_START,
  DRAG_GAIN_END,
  DRAG_RISE_SECONDS,
  DRAG_FROM_HZ,
  DRAG_TO_HZ,
  DRAG_CRACKLE_GAIN,
  SMOKE_EXHALE_SECONDS_MIN,
  SMOKE_EXHALE_SECONDS_MAX,
  SMOKE_EXHALE_GAIN_MIN,
  SMOKE_EXHALE_GAIN_MAX,
} from "./sound-constants.js";

/** Soft, slightly breathy noise that loops without a click. */
function synthIntakeNoise(sampleRate, seconds = 2) {
  const n = Math.floor(seconds * sampleRate);
  const samples = new Float32Array(n);
  let low = 0;
  for (let i = 0; i < n; i++) {
    low += 0.35 * (Math.random() * 2 - 1 - low);
    samples[i] = low + 0.4 * (Math.random() * 2 - 1);
  }
  const fade = Math.floor(0.1 * sampleRate);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    samples[i] = samples[i] * k + samples[n - fade + i] * (1 - k);
  }
  return new Float32Array(samples.subarray(0, n - fade));
}

/** One breath out: a gentle swell, the pitch of the air falls. */
function synthExhale(sampleRate, seconds) {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  const air = bandpass(sampleRate, 0.7);
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const envelope = Math.pow(Math.sin(Math.PI * Math.pow(x, 0.7)), 1.4);
    out[i] = air(Math.random() * 2 - 1, lerp(1100, 450, x)) * envelope;
  }
  return finish(out, sampleRate, 0.9, 0.02);
}

/** A tiny pop of the glowing tobacco. */
function synthCrackle(sampleRate) {
  const n = Math.floor(0.02 * sampleRate);
  const out = new Float32Array(n);
  const tick = bandpass(sampleRate, 1.2);
  for (let i = 0; i < n; i++) out[i] = tick(Math.random() * 2 - 1, 4000 + Math.random() * 2500) * Math.exp(-i / (n * 0.18));
  return finish(out, sampleRate, 0.9, 0.0002);
}

const toBuffer = (audio, samples) => {
  const buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
  buffer.copyToChannel(samples, 0);
  return buffer;
};

let intake = null;
let crackles = null;

/**
 * The drag begins: a looping intake that gets louder and brighter, with crackling. Call `stop()`
 * on the returned handle when the key is released.
 * @returns {{ stop: () => void } | null}
 */
export function startDragSound() {
  const audio = getAudioContext();
  const master = getMasterNode();
  if (!audio || !master) return null;
  intake ??= toBuffer(audio, synthIntakeNoise(audio.sampleRate));
  crackles ??= Array.from({ length: 4 }, () => toBuffer(audio, synthCrackle(audio.sampleRate)));

  const source = audio.createBufferSource();
  source.buffer = intake;
  source.loop = true;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.9;
  const now = audio.currentTime;
  filter.frequency.setValueAtTime(DRAG_FROM_HZ, now);
  filter.frequency.linearRampToValueAtTime(DRAG_TO_HZ, now + DRAG_RISE_SECONDS);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(DRAG_GAIN_START, now + 0.12);
  gain.gain.linearRampToValueAtTime(DRAG_GAIN_END, now + DRAG_RISE_SECONDS);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start();

  // the crackle of the glowing tobacco at random moments
  let alive = true;
  const crackle = () => {
    if (!alive) return;
    playBuffer(crackles[Math.floor(Math.random() * crackles.length)], { gain: DRAG_CRACKLE_GAIN * (0.4 + Math.random()), rate: 0.9 + Math.random() * 0.3 });
    window.setTimeout(crackle, 50 + Math.random() * 130);
  };
  window.setTimeout(crackle, 80);

  return {
    stop() {
      alive = false;
      const t = audio.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.12);
      source.stop(t + 0.15);
    },
  };
}

/**
 * The breath out after the drag.
 * @param {number} strength — 0 (a puff) … 1 (a long drag): longer and louder
 */
export function playExhaleSound(strength) {
  const audio = getAudioContext();
  if (!audio) return;
  const seconds = lerp(SMOKE_EXHALE_SECONDS_MIN, SMOKE_EXHALE_SECONDS_MAX, strength);
  playBuffer(toBuffer(audio, synthExhale(audio.sampleRate, seconds)), {
    gain: lerp(SMOKE_EXHALE_GAIN_MIN, SMOKE_EXHALE_GAIN_MAX, strength),
    rate: 0.97 + Math.random() * 0.06,
  });
}
