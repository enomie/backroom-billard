/**
 * Generated, buffered collision sounds: ball–ball "klack" and ball–cushion "thump".
 * Loudness and brightness follow the impact speed. See _docs/sound.md.
 */
import { getAudioContext, playBuffer, allowSound, impactStrength } from "./audio.js";
import { lerp, pick, bandpass, finish } from "./synth-utils.js";
import {
  BALL_HIT_SECONDS,
  BALL_HIT_STAGES,
  BALL_HIT_VARIANTS,
  BALL_HIT_GAIN_MIN,
  BALL_HIT_GAIN_MAX,
  CUSHION_HIT_SECONDS,
  CUSHION_HIT_STAGES,
  CUSHION_HIT_VARIANTS,
  CUSHION_HIT_GAIN_MIN,
  CUSHION_HIT_GAIN_MAX,
  PITCH_VARIATION,
} from "./sound-constants.js";

/** Sum of damped sinusoids plus a short noise click. modes: [Hz, amplitude, decay seconds] */
function ring(sampleRate, seconds, modes, clickGain, clickHz, clickDecay) {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  const click = bandpass(sampleRate, 0.8);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = 0;
    for (const [f, a, tau] of modes) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / tau);
    v += clickGain * click(Math.random() * 2 - 1, clickHz) * Math.exp(-t / clickDecay);
    out[i] = v;
  }
  return finish(out, sampleRate, 0.9, 0.0003);
}

const detune = () => 1 + (Math.random() - 0.5) * 0.06; // every variant rings slightly differently

/**
 * The "klack" of two phenolic balls: a sharp broadband contact click, a short wooden-glassy body
 * from several inharmonic shell modes (each a slightly split pair, so it beats like a real ball
 * instead of ringing like a pure tone) and a small low knock. Harder impacts are brighter.
 */
function synthBallHit(sampleRate, stage) {
  const hard = stage / Math.max(1, BALL_HIT_STAGES - 1); // 0 soft … 1 hard
  const n = Math.floor(BALL_HIT_SECONDS * sampleRate);
  const out = new Float32Array(n);
  const spread = 1 + (Math.random() - 0.5) * 0.14; // every variant is a slightly different ball pair
  // [Hz, amplitude, decay seconds]
  const modes = [
    [620 * detune(), 0.3, 0.022], // low knock
    [1250 * spread, 0.55, 0.014],
    [2050 * spread, 0.8, 0.01],
    [3100 * spread * (1 + 0.15 * hard), 1.0, 0.007 - 0.002 * hard],
    [4600 * spread * (1 + 0.2 * hard), 0.45 + 0.35 * hard, 0.0045],
    [6600 * spread, 0.12 + 0.4 * hard, 0.0028],
  ].map(([f, a, tau]) => ({ f, a, tau, split: 1 + (0.008 + Math.random() * 0.02), phase: Math.random() * 6.28 }));
  const contact = bandpass(sampleRate, 0.5); // broadband tick
  const tick = bandpass(sampleRate, 0.8); // dull body of the noise
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = 0;
    for (const m of modes) {
      v +=
        m.a *
        (Math.sin(2 * Math.PI * m.f * t + m.phase) + 0.8 * Math.sin(2 * Math.PI * m.f * m.split * t)) *
        Math.exp(-t / m.tau);
    }
    const noise = Math.random() * 2 - 1;
    v += (1.4 + 0.8 * hard) * contact(noise, 3500 + 2500 * hard) * Math.exp(-t / 0.0007);
    v += 0.6 * tick(noise, 1800) * Math.exp(-t / 0.004);
    out[i] = Math.tanh(v * 0.9); // contact saturation: a little crack on hard hits
  }
  return finish(out, sampleRate, 0.9, 0.0002);
}

/** Duller and longer: ball on rubber over wood, low-mid thump, muffled click. */
function synthCushionHit(sampleRate, stage) {
  const hard = stage / Math.max(1, CUSHION_HIT_STAGES - 1);
  return ring(
    sampleRate,
    CUSHION_HIT_SECONDS,
    [
      [210 * detune(), 1.0, 0.03 + 0.01 * hard],
      [380 * detune(), 0.7, 0.022],
      [900 * (1 + 0.3 * hard) * detune(), 0.35 + 0.3 * hard, 0.012],
      [90 * detune(), 0.5, 0.05], // wooden body
    ],
    0.35 + 0.4 * hard,
    1800,
    0.003
  );
}

/**
 * Synthesize all collision samples (pure, no Web Audio needed).
 * @param {number} sampleRate
 */
export function synthesizeCollisionSounds(sampleRate) {
  return {
    ball: Array.from({ length: BALL_HIT_STAGES }, (_, s) =>
      Array.from({ length: BALL_HIT_VARIANTS }, () => synthBallHit(sampleRate, s))
    ),
    cushion: Array.from({ length: CUSHION_HIT_STAGES }, (_, s) =>
      Array.from({ length: CUSHION_HIT_VARIANTS }, () => synthCushionHit(sampleRate, s))
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
  const raw = synthesizeCollisionSounds(audio.sampleRate);
  const convert = (stages) => stages.map((variants) => variants.map((s) => toBuffer(audio, s)));
  buffers = { ball: convert(raw.ball), cushion: convert(raw.cushion) };
  return buffers;
}

const variation = () => 1 + (Math.random() * 2 - 1) * PITCH_VARIATION;

/**
 * Two balls hit each other.
 * @param {number} speed — impact speed along the collision normal (m/s)
 * @param {string} sourceKey — identifies the pair (cooldown)
 */
export function playBallHitSound(speed, sourceKey) {
  const s = impactStrength(speed);
  if (s < 0 || !allowSound(sourceKey)) return;
  const b = ensureBuffers();
  if (!b) return;
  const stage = Math.round(s * (BALL_HIT_STAGES - 1));
  playBuffer(pick(b.ball[stage]), {
    gain: lerp(BALL_HIT_GAIN_MIN, BALL_HIT_GAIN_MAX, Math.sqrt(s)),
    rate: variation(),
  });
}

/**
 * A ball hits the cushion.
 * @param {number} speed — impact speed along the cushion normal (m/s)
 * @param {string} sourceKey — identifies the ball (cooldown)
 */
export function playCushionHitSound(speed, sourceKey) {
  const s = impactStrength(speed);
  if (s < 0 || !allowSound(sourceKey)) return;
  const b = ensureBuffers();
  if (!b) return;
  const stage = Math.round(s * (CUSHION_HIT_STAGES - 1));
  playBuffer(pick(b.cushion[stage]), {
    gain: lerp(CUSHION_HIT_GAIN_MIN, CUSHION_HIT_GAIN_MAX, Math.sqrt(s)),
    rate: variation(),
  });
}
