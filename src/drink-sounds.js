/**
 * The sounds of drinking: the gulp (swallow), the liquid that runs while the glass is tilted, and
 * the sigh after a long drink. All generated; they come from the player himself, so they are not
 * positioned.
 */
import { getAudioContext, getMasterNode, playBuffer } from "./audio.js";
import { bandpass, finish, pick } from "./synth-utils.js";
import { lerp } from "./math-utils.js";
import { GULP_GAIN, GULP_SECONDS, GULP_VARIANTS, DRINK_FLOW, AHH_GAIN, AHH_SECONDS } from "./sound-constants.js";

/** One swallow: a small air click, a throat thump whose pitch falls, and a gluck of water behind it. */
function synthGulp(sampleRate) {
  const n = Math.floor(GULP_SECONDS * sampleRate);
  const out = new Float32Array(n);
  const water = bandpass(sampleRate, 3);
  const click = bandpass(sampleRate, 1.5);
  const thumpHz = 90 + Math.random() * 40;
  const gluckAt = 0.05 + Math.random() * 0.03; // when the second, smaller gluck follows
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const thump = Math.exp(-t / 0.045) * Math.min(1, t / 0.004);
    phase += (2 * Math.PI * thumpHz * (1 - 0.5 * Math.min(1, t / 0.12))) / sampleRate;
    let v = 0.7 * Math.sin(phase) * thump;
    v += 0.5 * click(Math.random() * 2 - 1, 2200) * Math.exp(-t / 0.002); // the swallow click
    // the water: noise whose pitch rises, twice (the second gluck is smaller)
    for (const [at, gain] of [[0.004, 0.8], [gluckAt, 0.45]]) {
      const x = t - at;
      if (x < 0) continue;
      v += gain * water(Math.random() * 2 - 1, 280 + 900 * Math.min(1, x / 0.05)) * Math.exp(-x / 0.03);
    }
    out[i] = v;
  }
  return finish(out, sampleRate, 0.9, 0.003);
}

/** Bubbling noise that loops without a click: pieces of water, the volume flutters. */
function synthFlow(sampleRate, seconds = 1.5) {
  const fade = Math.floor(0.1 * sampleRate);
  const n = Math.floor(seconds * sampleRate) + fade;
  const raw = new Float32Array(n);
  let low = 0;
  let flutter = 0;
  for (let i = 0; i < n; i++) {
    low += 0.4 * (Math.random() * 2 - 1 - low);
    flutter += 0.0006 * (Math.random() * 2 - 1 - flutter); // slow swell of the bubbling
    raw[i] = (low + 0.3 * (Math.random() * 2 - 1)) * (0.7 + 6 * Math.abs(flutter));
  }
  const length = n - fade;
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    raw[i] = raw[i] * Math.sqrt(k) + raw[length + i] * Math.sqrt(1 - k); // equal-power crossfade of the seam
  }
  return new Float32Array(raw.subarray(0, length));
}

/** A relieved "ahh": breath through two vowel bands plus a faint, falling hum. */
function synthAhh(sampleRate) {
  const n = Math.floor(AHH_SECONDS * sampleRate);
  const out = new Float32Array(n);
  const low = bandpass(sampleRate, 4);
  const high = bandpass(sampleRate, 5);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const k = t / AHH_SECONDS;
    const envelope = Math.min(1, t / 0.09) * Math.pow(1 - k, 1.5);
    const breath = Math.random() * 2 - 1;
    let v = low(breath, 750) + 0.6 * high(breath, 1150);
    phase += (2 * Math.PI * lerp(135, 105, k)) / sampleRate;
    v += 0.5 * (Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase));
    out[i] = v * envelope;
  }
  return finish(out, sampleRate, 0.9, 0.01);
}

let gulps = null;
let flow = null;
let ahh = null;

const toBuffer = (audio, samples) => {
  const buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
  buffer.copyToChannel(samples, 0);
  return buffer;
};

/** One swallow. */
export function playGulpSound() {
  const audio = getAudioContext();
  if (!audio) return;
  gulps ??= Array.from({ length: GULP_VARIANTS }, () => toBuffer(audio, synthGulp(audio.sampleRate)));
  playBuffer(pick(gulps), { gain: GULP_GAIN * (0.85 + Math.random() * 0.3), rate: 0.92 + Math.random() * 0.16 });
}

/**
 * The liquid sound while the glass is tilted; call `stop()` on the returned handle when it goes back.
 * @param {string} kind — the drink (beer, wine-red, …)
 * @returns {{ stop: () => void } | null}
 */
export function startFlowSound(kind) {
  const audio = getAudioContext();
  const master = getMasterNode();
  if (!audio || !master) return null;
  flow ??= toBuffer(audio, synthFlow(audio.sampleRate));
  const { hz, q, gain: level } = DRINK_FLOW[kind] ?? DRINK_FLOW.whiskey;
  const source = audio.createBufferSource();
  source.buffer = flow;
  source.loop = true;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = hz;
  filter.Q.value = q;
  const gain = audio.createGain();
  const now = audio.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(level, now + 0.15);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start();
  return {
    stop() {
      const t = audio.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.12);
      source.stop(t + 0.15);
    },
  };
}

/** The sigh after a long drink. */
export function playAhhSound() {
  const audio = getAudioContext();
  if (!audio) return;
  ahh ??= toBuffer(audio, synthAhh(audio.sampleRate));
  playBuffer(ahh, { gain: AHH_GAIN, rate: 0.95 + Math.random() * 0.1 });
}
