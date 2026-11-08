/**
 * The sound of a sip: liquid gurgling in the glass, two or three gulps and a soft swallow.
 * Generated; comes from the player himself, so it is not positioned.
 */
import { getAudioContext, playBuffer } from "./audio.js";
import { bandpass, finish } from "./synth-utils.js";
import { SIP_GAIN, SIP_SECONDS } from "./sound-constants.js";

function synthSip(sampleRate) {
  const n = Math.floor(SIP_SECONDS * sampleRate);
  const out = new Float32Array(n);
  const gurgle = bandpass(sampleRate, 2.2);
  const gulps = [0.12, 0.34, 0.52].map((at) => at * SIP_SECONDS);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = 0;
    for (const at of gulps) {
      const x = t - at;
      if (x < 0 || x > 0.16) continue;
      const envelope = Math.sin((Math.PI * x) / 0.16) ** 2;
      // a gulp: water noise whose pitch bends up, plus a low thump
      v += gurgle(Math.random() * 2 - 1, 380 + 900 * (x / 0.16)) * envelope * 0.9;
      phase += (2 * Math.PI * (110 - 35 * (x / 0.16))) / sampleRate;
      v += Math.sin(phase) * envelope * 0.35;
    }
    // the last swallow: a short falling throat sound
    const s = t - 0.66 * SIP_SECONDS;
    if (s > 0 && s < 0.12) v += Math.sin(2 * Math.PI * (150 - 400 * s) * s) * (1 - s / 0.12) * 0.4;
    out[i] = v;
  }
  return finish(out, sampleRate, 0.9, 0.01);
}

let buffer = null;

/** One sip. */
export function playSipSound() {
  const audio = getAudioContext();
  if (!audio) return;
  if (!buffer) {
    const samples = synthSip(audio.sampleRate);
    buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
    buffer.copyToChannel(samples, 0);
  }
  playBuffer(buffer, { gain: SIP_GAIN, rate: 0.95 + Math.random() * 0.1 });
}
