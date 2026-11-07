/**
 * Generated, buffered sounds around the pockets: the tick on the hole's rim, the slide into the
 * dark, the landing in the cup (with a short bounce and settling roll) and hits on the cup wall.
 * See _docs/sound.md.
 */
import { getAudioContext, playBuffer, allowSound, impactStrength } from "./audio.js";
import { lerp, pick, bandpass, finish } from "./synth-utils.js";
import {
  CUP_RIM_GAIN_MIN,
  CUP_RIM_GAIN_MAX,
  CUP_FALL_GAIN,
  CUP_LANDING_SECONDS,
  CUP_LANDING_STAGES,
  CUP_LANDING_VARIANTS,
  CUP_LANDING_GAIN_MIN,
  CUP_LANDING_GAIN_MAX,
  CUP_WALL_STAGES,
  CUP_WALL_VARIANTS,
  CUP_WALL_GAIN_MIN,
  CUP_WALL_GAIN_MAX,
  PITCH_VARIATION,
} from "./sound-constants.js";

const detune = () => 1 + (Math.random() - 0.5) * 0.06;

/** Damped sinusoids [Hz, amplitude, decay s] starting at `startSeconds`, added into `out`. */
function addModes(out, sampleRate, modes, startSeconds, gain) {
  const start = Math.floor(startSeconds * sampleRate);
  for (let i = start; i < out.length; i++) {
    const t = (i - start) / sampleRate;
    let v = 0;
    for (const [f, a, tau] of modes) {
      const e = Math.exp(-t / tau);
      if (e < 0.002) continue;
      v += a * Math.sin(2 * Math.PI * f * t) * e;
    }
    out[i] += v * gain;
  }
}

/** Short, light "tick" of the ball touching the metal/leather edge of the hole. */
function synthRim(sampleRate) {
  const out = new Float32Array(Math.floor(0.05 * sampleRate));
  const click = bandpass(sampleRate, 1);
  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    out[i] = click(Math.random() * 2 - 1, 3800) * Math.exp(-t / 0.002) * 0.8;
  }
  addModes(out, sampleRate, [[1900 * detune(), 0.7, 0.006], [850 * detune(), 0.4, 0.01]], 0, 1);
  return finish(out, sampleRate, 0.9, 0.0003);
}

/** The ball slides over the leather into the dark: soft, low-passed noise that fades in and out. */
function synthFall(sampleRate) {
  const seconds = 0.2;
  const out = new Float32Array(Math.floor(seconds * sampleRate));
  const air = bandpass(sampleRate, 0.6);
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    const envelope = Math.pow(Math.sin(Math.PI * Math.pow(x, 0.7)), 1.5);
    out[i] = air(Math.random() * 2 - 1, 900 - 500 * x) * envelope;
  }
  return finish(out, sampleRate, 0.9);
}

/**
 * Landing on the cup floor: a dull thump (leather over wood), a smaller bounce and an even
 * smaller one, then a short soft rolling rumble while it settles. `stage` 0..n-1: harder fall
 * = louder, higher partials and bigger bounces.
 */
function synthLanding(sampleRate, stage) {
  const hard = stage / Math.max(1, CUP_LANDING_STAGES - 1);
  const out = new Float32Array(Math.floor(CUP_LANDING_SECONDS * sampleRate));
  const thump = () => [
    [150 * detune(), 1.0, 0.025],
    [330 * detune(), 0.6, 0.018],
    [780 * (1 + 0.3 * hard) * detune(), 0.3 + 0.3 * hard, 0.01],
  ];
  addModes(out, sampleRate, thump(), 0, 1);
  addModes(out, sampleRate, thump(), 0.085 + 0.02 * hard, 0.4 + 0.2 * hard); // first bounce
  addModes(out, sampleRate, thump(), 0.17 + 0.03 * hard, 0.18 + 0.1 * hard); // second bounce
  // settling roll: low rumble that decays
  const rumble = bandpass(sampleRate, 0.8);
  for (let i = Math.floor(0.1 * sampleRate); i < out.length; i++) {
    const x = (i - 0.1 * sampleRate) / (out.length - 0.1 * sampleRate);
    out[i] += rumble(Math.random() * 2 - 1, 220) * 0.35 * Math.pow(1 - x, 2) * (0.5 + hard * 0.5);
  }
  return finish(out, sampleRate, 0.9, 0.0004);
}

/** Ball against the cup wall: damped, dull "tok" (more muffled than ball–ball). */
function synthWall(sampleRate, stage) {
  const hard = stage / Math.max(1, CUP_WALL_STAGES - 1);
  const out = new Float32Array(Math.floor(0.15 * sampleRate));
  addModes(
    out,
    sampleRate,
    [
      [420 * (1 + 0.2 * hard) * detune(), 1.0, 0.012],
      [820 * detune(), 0.5, 0.008],
      [200 * detune(), 0.6, 0.02],
    ],
    0,
    1
  );
  const click = bandpass(sampleRate, 0.8);
  for (let i = 0; i < out.length; i++) {
    out[i] += 0.3 * click(Math.random() * 2 - 1, 1400) * Math.exp(-i / sampleRate / 0.003);
  }
  return finish(out, sampleRate, 0.9, 0.0004);
}

/** @param {number} sampleRate */
export function synthesizeCupSounds(sampleRate) {
  return {
    rim: Array.from({ length: 3 }, () => synthRim(sampleRate)),
    fall: Array.from({ length: 2 }, () => synthFall(sampleRate)),
    landing: Array.from({ length: CUP_LANDING_STAGES }, (_, s) =>
      Array.from({ length: CUP_LANDING_VARIANTS }, () => synthLanding(sampleRate, s))
    ),
    wall: Array.from({ length: CUP_WALL_STAGES }, (_, s) =>
      Array.from({ length: CUP_WALL_VARIANTS }, () => synthWall(sampleRate, s))
    ),
  };
}

let buffers = null;
const toBuffer = (audio, samples) => {
  const buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
  buffer.copyToChannel(samples, 0);
  return buffer;
};

function ensureBuffers() {
  if (buffers) return buffers;
  const audio = getAudioContext();
  if (!audio) return null;
  const raw = synthesizeCupSounds(audio.sampleRate);
  const flat = (list) => list.map((s) => toBuffer(audio, s));
  const staged = (list) => list.map(flat);
  buffers = { rim: flat(raw.rim), fall: flat(raw.fall), landing: staged(raw.landing), wall: staged(raw.wall) };
  return buffers;
}

const variation = () => 1 + (Math.random() * 2 - 1) * PITCH_VARIATION;

/**
 * A ball rolls over the rim and starts to fall: a tick on the edge, then the slide into the cup.
 * @param {number} speed — horizontal speed of the ball (m/s)
 * @param {string} sourceKey
 */
export function playPocketEntrySound(speed, sourceKey) {
  if (!allowSound(sourceKey)) return;
  const b = ensureBuffers();
  if (!b) return;
  const s = Math.min(1, speed / 3);
  playBuffer(pick(b.rim), { gain: lerp(CUP_RIM_GAIN_MIN, CUP_RIM_GAIN_MAX, s), rate: variation() });
  playBuffer(pick(b.fall), { gain: CUP_FALL_GAIN * (0.5 + 0.5 * s), rate: variation(), delay: 0.01 });
}

/**
 * The ball lands on the cup floor.
 * @param {number} speed — impact speed (m/s)
 * @param {string} sourceKey
 */
export function playCupLandingSound(speed, sourceKey) {
  const s = impactStrength(speed);
  if (s < 0 || !allowSound(sourceKey)) return;
  const b = ensureBuffers();
  if (!b) return;
  const stage = Math.round(s * (CUP_LANDING_STAGES - 1));
  playBuffer(pick(b.landing[stage]), {
    gain: lerp(CUP_LANDING_GAIN_MIN, CUP_LANDING_GAIN_MAX, Math.sqrt(s)),
    rate: variation(),
  });
}

/**
 * The ball hits the cup wall.
 * @param {number} speed — impact speed (m/s)
 * @param {string} sourceKey
 */
export function playCupWallSound(speed, sourceKey) {
  const s = impactStrength(speed);
  if (s < 0 || !allowSound(sourceKey)) return;
  const b = ensureBuffers();
  if (!b) return;
  const stage = Math.round(s * (CUP_WALL_STAGES - 1));
  playBuffer(pick(b.wall[stage]), {
    gain: lerp(CUP_WALL_GAIN_MIN, CUP_WALL_GAIN_MAX, Math.sqrt(s)),
    rate: variation(),
  });
}
