/**
 * Generated, buffered sounds for the cue stroke: hand sliding on the shaft while drawing back,
 * a subtle inhale/exhale, and the air swish when the cue snaps forward. See _docs/sound.md.
 *
 * The sounds are synthesized once (filtered noise) into AudioBuffers and then only played back,
 * with the power choosing gain/brightness and a little random pitch variation.
 */
import { getAudioContext, playBuffer } from "./audio.js";
import { lerp, pick, bandpass, slowNoise, finish } from "./synth-utils.js";
import {
  SLIDE_LENGTHS,
  SLIDE_VARIANTS,
  SLIDE_GAIN_MIN,
  SLIDE_GAIN_MAX,
  BREATH_ENABLED,
  BREATH_IN_SECONDS,
  BREATH_OUT_SECONDS,
  BREATH_VARIANTS,
  BREATH_IN_GAIN_MIN,
  BREATH_IN_GAIN_MAX,
  BREATH_OUT_GAIN_MIN,
  BREATH_OUT_GAIN_MAX,
  WHOOSH_SECONDS,
  WHOOSH_PEAK,
  WHOOSH_STAGES,
  WHOOSH_VARIANTS,
  WHOOSH_GAIN_MIN,
  WHOOSH_GAIN_MAX,
  STRIKE_SECONDS,
  STRIKE_STAGES,
  STRIKE_VARIANTS,
  STRIKE_GAIN_MIN,
  STRIKE_GAIN_MAX,
  PITCH_VARIATION,
} from "./sound-constants.js";

/** Hand sliding over wood: mid-band "shhh", loudest in the middle (bell-shaped), rough texture. */
function synthSlide(sampleRate, seconds) {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  const mid = bandpass(sampleRate, 0.9);
  const body = bandpass(sampleRate, 1.2);
  const rough = slowNoise(sampleRate, 45);
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const envelope = Math.pow(Math.sin(Math.PI * x), 1.3);
    const noise = Math.random() * 2 - 1;
    const texture = 0.65 + 0.35 * Math.abs(rough()) * 3;
    out[i] = (mid(noise, 2300) + 0.5 * body(noise, 450)) * envelope * texture;
  }
  return finish(out, sampleRate);
}

/** Soft breath: bandpassed noise, slow swell. Inhale rises in pitch, exhale falls. */
function synthBreath(sampleRate, seconds, fromHz, toHz, attack) {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  const air = bandpass(sampleRate, 0.7);
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const envelope = x < attack ? Math.pow(x / attack, 1.6) : Math.pow(1 - (x - attack) / (1 - attack), 1.8);
    out[i] = air(Math.random() * 2 - 1, lerp(fromHz, toHz, x)) * envelope;
  }
  return finish(out, sampleRate);
}

/**
 * Air swish: noise through a sweeping bandpass that rises in pitch and volume, peaking shortly
 * before the end and then stopping fast (the moment the tip hits the ball). `stage` 0..n-1:
 * harder shots are brighter.
 */
function synthWhoosh(sampleRate, stage) {
  const n = Math.floor(WHOOSH_SECONDS * sampleRate);
  const out = new Float32Array(n);
  const air = bandpass(sampleRate, 1.2);
  const bright = 1 + (stage / Math.max(1, WHOOSH_STAGES - 1)) * 0.5;
  const startHz = 700 * bright;
  const endHz = 3200 * bright;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const rise = Math.pow(Math.min(x / WHOOSH_PEAK, 1), 2.2);
    const cut = x <= WHOOSH_PEAK ? 1 : Math.exp(-(x - WHOOSH_PEAK) * 60);
    const hz = startHz * Math.pow(endHz / startHz, Math.min(x / WHOOSH_PEAK, 1));
    out[i] = air(Math.random() * 2 - 1, hz) * rise * cut;
  }
  return finish(out, sampleRate);
}

/**
 * Tip hits ball: a very short bright click, the ball's ringing "tock" (damped high partials),
 * the shaft's body resonance and a soft low thump. `stage` 0..n-1: harder = brighter, sharper
 * and with less low thump.
 */
function synthStrike(sampleRate, stage) {
  const n = Math.floor(STRIKE_SECONDS * sampleRate);
  const out = new Float32Array(n);
  const hard = stage / Math.max(1, STRIKE_STAGES - 1); // 0 soft … 1 hard
  const detune = () => 1 + (Math.random() - 0.5) * 0.04; // each variant rings slightly differently
  // [frequency Hz, amplitude, decay time constant s]
  const modes = [
    [2300 * (1 + 0.4 * hard) * detune(), 1.0, 0.012 - 0.004 * hard],
    [3900 * (1 + 0.4 * hard) * detune(), 0.55 * (0.4 + hard), 0.008],
    [6200 * detune(), 0.25 * hard, 0.004],
    [520 * detune(), 0.5, 0.045], // shaft body
    [160 * detune(), 0.6 * (1 - 0.5 * hard), 0.02], // soft thump
  ];
  const click = bandpass(sampleRate, 0.8);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = 0;
    for (const [f, a, tau] of modes) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / tau);
    // initial contact click: noise with a ~1.5 ms decay
    v += (0.8 + 0.6 * hard) * click(Math.random() * 2 - 1, 5500) * Math.exp(-t / 0.0015);
    out[i] = v;
  }
  return finish(out, sampleRate, 0.9, 0.0003); // a click needs a sharp attack: tiny fade-in
}

/**
 * Synthesize every sample of the stroke sounds (pure, no Web Audio needed).
 * @param {number} sampleRate
 */
export function synthesizeShotSounds(sampleRate) {
  return {
    slide: SLIDE_LENGTHS.map((seconds) =>
      Array.from({ length: SLIDE_VARIANTS }, () => synthSlide(sampleRate, seconds))
    ),
    breathIn: Array.from({ length: BREATH_VARIANTS }, () =>
      synthBreath(sampleRate, BREATH_IN_SECONDS, 700, 1500, 0.55)
    ),
    breathOut: Array.from({ length: BREATH_VARIANTS }, () =>
      synthBreath(sampleRate, BREATH_OUT_SECONDS, 1000, 500, 0.15)
    ),
    whoosh: Array.from({ length: WHOOSH_STAGES }, (_, stage) =>
      Array.from({ length: WHOOSH_VARIANTS }, () => synthWhoosh(sampleRate, stage))
    ),
    strike: Array.from({ length: STRIKE_STAGES }, (_, stage) =>
      Array.from({ length: STRIKE_VARIANTS }, () => synthStrike(sampleRate, stage))
    ),
  };
}

/** @type {null | { slide: AudioBuffer[][], breathIn: AudioBuffer[], breathOut: AudioBuffer[], whoosh: AudioBuffer[][], strike: AudioBuffer[][] }} */
let buffers = null;

function toBuffer(audio, samples) {
  const buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
  buffer.copyToChannel(samples, 0);
  return buffer;
}

/** Build the AudioBuffers once, on first use. */
function ensureBuffers() {
  if (buffers) return buffers;
  const audio = getAudioContext();
  if (!audio) return null;
  const raw = synthesizeShotSounds(audio.sampleRate);
  buffers = {
    slide: raw.slide.map((length) => length.map((s) => toBuffer(audio, s))),
    breathIn: raw.breathIn.map((s) => toBuffer(audio, s)),
    breathOut: raw.breathOut.map((s) => toBuffer(audio, s)),
    whoosh: raw.whoosh.map((stage) => stage.map((s) => toBuffer(audio, s))),
    strike: raw.strike.map((stage) => stage.map((s) => toBuffer(audio, s))),
  };
  return buffers;
}

/** Random playback rate around 1 (pitch variation). */
const variation = () => 1 + (Math.random() * 2 - 1) * PITCH_VARIATION;

/**
 * The cue is drawn back: sliding sound (stretched to the draw-back time) and a soft inhale.
 * @param {number} strength — 0 (weakest) … 1 (strongest shot)
 * @param {number} seconds — duration of the draw-back animation
 */
export function playDrawBackSound(strength, seconds) {
  const b = ensureBuffers();
  if (!b) return;
  // Closest generated length (by ratio), played a little faster/slower to fit the draw-back time
  let best = 0;
  SLIDE_LENGTHS.forEach((len, i) => {
    if (Math.abs(Math.log(len / seconds)) < Math.abs(Math.log(SLIDE_LENGTHS[best] / seconds))) best = i;
  });
  playBuffer(pick(b.slide[best]), {
    gain: lerp(SLIDE_GAIN_MIN, SLIDE_GAIN_MAX, strength),
    rate: (SLIDE_LENGTHS[best] / seconds) * variation(),
  });
  if (BREATH_ENABLED) {
    playBuffer(pick(b.breathIn), {
      gain: lerp(BREATH_IN_GAIN_MIN, BREATH_IN_GAIN_MAX, strength),
      rate: variation(),
    });
  }
}

/**
 * The cue snaps forward: air swish whose peak lands on the moment of contact, and a short exhale.
 * @param {number} strength — 0 … 1
 * @param {number} seconds — duration of the forward stroke (until the tip hits the ball)
 */
export function playForwardSound(strength, seconds) {
  const b = ensureBuffers();
  if (!b) return;
  const stage = Math.round(strength * (WHOOSH_STAGES - 1));
  playBuffer(pick(b.whoosh[stage]), {
    gain: lerp(WHOOSH_GAIN_MIN, WHOOSH_GAIN_MAX, strength * strength),
    rate: ((WHOOSH_SECONDS * WHOOSH_PEAK) / seconds) * variation(), // peak lands on the contact
  });
  if (BREATH_ENABLED) {
    playBuffer(pick(b.breathOut), {
      gain: lerp(BREATH_OUT_GAIN_MIN, BREATH_OUT_GAIN_MAX, strength),
      rate: variation(),
    });
  }
}

/**
 * The tip hits the ball ("tock"). Call at the moment of contact.
 * @param {number} strength — 0 (weakest) … 1 (strongest shot)
 */
export function playStrikeSound(strength) {
  const b = ensureBuffers();
  if (!b) return;
  const stage = Math.round(strength * (STRIKE_STAGES - 1));
  playBuffer(pick(b.strike[stage]), {
    gain: lerp(STRIKE_GAIN_MIN, STRIKE_GAIN_MAX, Math.sqrt(strength)),
    rate: variation(),
  });
}
