/**
 * Very quiet rolling noise: one looping, seamless noise buffer through a lowpass; the level and
 * brightness follow how fast the balls roll on the table. See _docs/sound.md.
 */
import { getAudioContext, getMasterNode, createSoundPanner, setPannerPosition } from "./audio.js";
import { lerp } from "./synth-utils.js";
import {
  ROLL_GAIN_MAX,
  ROLL_FULL_ACTIVITY,
  ROLL_CUTOFF_MIN,
  ROLL_CUTOFF_MAX,
  ROLL_LOOP_SECONDS,
  ROLL_SMOOTHING,
} from "./sound-constants.js";

/** Soft, low-weighted noise (brownish) that loops without a click. Pure, for testing. */
export function synthesizeRollNoise(sampleRate, seconds = ROLL_LOOP_SECONDS) {
  const n = Math.floor(seconds * sampleRate);
  const samples = new Float32Array(n);
  let low = 0;
  for (let i = 0; i < n; i++) {
    low += 0.12 * (Math.random() * 2 - 1 - low); // one-pole lowpass: a soft "shhh" with body
    samples[i] = low + 0.3 * (Math.random() * 2 - 1);
  }
  // Seamless loop: crossfade the last 0.15 s into the first 0.15 s
  const fade = Math.floor(0.15 * sampleRate);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    samples[i] = samples[i] * k + samples[n - fade + i] * (1 - k);
  }
  const body = samples.subarray(0, n - fade);
  let peak = 0;
  for (const v of body) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < body.length; i++) body[i] /= peak || 1;
  return new Float32Array(body);
}

let nodes = null;

function ensureNodes() {
  if (nodes) return nodes;
  const audio = getAudioContext();
  const master = getMasterNode();
  if (!audio || !master) return null;
  const samples = synthesizeRollNoise(audio.sampleRate);
  const buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
  buffer.copyToChannel(samples, 0);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = ROLL_CUTOFF_MIN;
  const gain = audio.createGain();
  gain.gain.value = 0;
  source.connect(filter);
  filter.connect(gain);
  const panner = createSoundPanner(audio, [0, 0, 0]);
  gain.connect(panner);
  panner.connect(master);
  source.start();
  nodes = { audio, filter, gain, panner };
  return nodes;
}

/**
 * Call regularly (e.g. once per frame) with the balls rolling on the table. The sound comes from
 * the speed-weighted center of the rolling balls.
 * @param {{ speed: number, position: [number, number, number] }[]} rolling — speeds in m/s
 */
export function updateRollingSound(rolling) {
  if (!nodes) {
    if (rolling.length === 0) return; // nothing to hear: do not even create the nodes
    if (!ensureNodes()) return;
  }
  const { audio, filter, gain, panner } = nodes;
  let activity = 0;
  let fastest = 0;
  const center = [0, 0, 0];
  for (const { speed, position } of rolling) {
    activity += speed;
    fastest = Math.max(fastest, speed);
    for (let i = 0; i < 3; i++) center[i] += position[i] * speed;
  }
  if (activity > 0) setPannerPosition(panner, center.map((v) => v / activity));
  const level = Math.min(1, Math.sqrt(activity / ROLL_FULL_ACTIVITY));
  const now = audio.currentTime;
  gain.gain.setTargetAtTime(level * ROLL_GAIN_MAX, now, ROLL_SMOOTHING);
  filter.frequency.setTargetAtTime(
    lerp(ROLL_CUTOFF_MIN, ROLL_CUTOFF_MAX, Math.min(1, fastest / 3)),
    now,
    ROLL_SMOOTHING
  );
}
