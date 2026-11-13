/**
 * Generated, buffered collision sounds: ball–ball "klack" and ball–cushion "thump".
 * Loudness and brightness follow the impact speed. See _docs/sound.md.
 */
import { getAudioContext, playBuffer, allowSound, impactStrength } from "./audio.js";
import { pick, bandpass, finish } from "./synth-utils.js";
import { lerp } from "./math-utils.js";
import {
  BALL_HIT_SECONDS,
  BALL_HIT_STAGES,
  BALL_HIT_VARIANTS,
  BALL_HIT_GAIN_MIN,
  BALL_HIT_GAIN_MAX,
  BALL_HIT_MODES,
  BALL_HIT_MODE_FLOOR,
  BALL_HIT_MODE_PITCH_DROP,
  BALL_HIT_DECAY_SCALE_MIN,
  BALL_HIT_DECAY_SCALE_MAX,
  BALL_HIT_CLICK_HZ_MIN,
  BALL_HIT_CLICK_HZ_MAX,
  BALL_HIT_CLICK_DECAY,
  BALL_HIT_CLICK_GAIN_MIN,
  BALL_HIT_CLICK_GAIN_MAX,
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
 * The "klack" of two phenolic balls: a hard noise click (the contact) plus the ball's vibration modes.
 * The harder the hit, the brighter the click, the more the high modes ring and the longer they last.
 */
function synthBallHit(sampleRate, stage) {
  const hard = stage / Math.max(1, BALL_HIT_STAGES - 1); // 0 soft … 1 hard
  const n = Math.floor(BALL_HIT_SECONDS * sampleRate);
  const out = new Float32Array(n);
  const decayScale = lerp(BALL_HIT_DECAY_SCALE_MIN, BALL_HIT_DECAY_SCALE_MAX, hard);
  const brightness = Math.pow(hard, 1.3);
  const pitch = 1 + (Math.random() - 0.5) * 0.03;
  const modes = BALL_HIT_MODES.map((m) => {
    const decay = m.decay * decayScale;
    const gain = m.gain * (1 - m.hard + m.hard * brightness);
    return {
      hz: m.hz * pitch,
      decay,
      gain,
      tau: decay / Math.log(Math.max(gain, BALL_HIT_MODE_FLOOR * 2) / BALL_HIT_MODE_FLOOR), // exponential fade to the floor
      phase: 0,
    };
  });
  const click = bandpass(sampleRate, 2.5);
  const clickHz = lerp(BALL_HIT_CLICK_HZ_MIN, BALL_HIT_CLICK_HZ_MAX, hard);
  const clickGain = lerp(BALL_HIT_CLICK_GAIN_MIN, BALL_HIT_CLICK_GAIN_MAX, hard);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = clickGain * click(Math.random() * 2 - 1, clickHz) * Math.exp(-t / BALL_HIT_CLICK_DECAY);
    for (const m of modes) {
      if (t > m.decay + 0.01) continue;
      // pitch glides down by BALL_HIT_MODE_PITCH_DROP over the decay time
      const hz = m.hz * Math.pow(BALL_HIT_MODE_PITCH_DROP, Math.min(t, m.decay) / m.decay);
      m.phase += (2 * Math.PI * hz) / sampleRate;
      v += m.gain * Math.sin(m.phase) * Math.exp(-t / m.tau);
    }
    out[i] = v;
  }
  return finish(out, sampleRate, 0.9, 0.00005);
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
 * @param {[number, number, number]} position — contact point
 */
export function playBallHitSound(speed, sourceKey, position) {
  const s = impactStrength(speed);
  if (s < 0 || !allowSound(sourceKey)) return;
  const b = ensureBuffers();
  if (!b) return;
  const stage = Math.round(s * (BALL_HIT_STAGES - 1));
  playBuffer(pick(b.ball[stage]), {
    gain: lerp(BALL_HIT_GAIN_MIN, BALL_HIT_GAIN_MAX, Math.sqrt(s)),
    rate: variation(),
    position,
  });
}

/**
 * A ball hits the cushion.
 * @param {number} speed — impact speed along the cushion normal (m/s)
 * @param {string} sourceKey — identifies the ball (cooldown)
 * @param {[number, number, number]} position — the ball
 */
export function playCushionHitSound(speed, sourceKey, position) {
  const s = impactStrength(speed);
  if (s < 0 || !allowSound(sourceKey)) return;
  const b = ensureBuffers();
  if (!b) return;
  const stage = Math.round(s * (CUSHION_HIT_STAGES - 1));
  playBuffer(pick(b.cushion[stage]), {
    gain: lerp(CUSHION_HIT_GAIN_MIN, CUSHION_HIT_GAIN_MAX, Math.sqrt(s)),
    rate: variation(),
    position,
  });
}
