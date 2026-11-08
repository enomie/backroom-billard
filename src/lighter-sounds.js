/**
 * Sounds of the lighter: the lid flips open with a metallic "clink", the flint wheel rasps and the
 * flame catches, the lid snaps shut. Generated, not positioned (the lighter is in the player's hand).
 */
import { getAudioContext, playBuffer } from "./audio.js";
import { bandpass, finish } from "./synth-utils.js";

function synthClink(sampleRate, low) {
  const n = Math.floor(0.22 * sampleRate);
  const out = new Float32Array(n);
  const click = bandpass(sampleRate, 1.5);
  const modes = low ? [[2300, 1, 0.025], [3700, 0.6, 0.015]] : [[3100, 1, 0.05], [5200, 0.7, 0.03], [7400, 0.35, 0.02]];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = click(Math.random() * 2 - 1, 4500) * Math.exp(-t / 0.0008) * 1.2;
    for (const [f, a, tau] of modes) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / tau);
    out[i] = v;
  }
  return finish(out, sampleRate, 0.9, 0.0002);
}

/** The flint wheel: a short rasp with sparks, then the whoosh of the flame. */
function synthFlick(sampleRate) {
  const n = Math.floor(0.4 * sampleRate);
  const out = new Float32Array(n);
  const rasp = bandpass(sampleRate, 1.0);
  const air = bandpass(sampleRate, 0.6);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const noise = Math.random() * 2 - 1;
    let v = t < 0.09 ? rasp(noise, 5500) * (0.5 + 0.5 * Math.sin(t * 900)) : 0;
    if (t > 0.07) v += air(noise, 700) * Math.exp(-(t - 0.07) / 0.12) * 0.7; // the flame catches
    out[i] = v;
  }
  return finish(out, sampleRate, 0.9, 0.005);
}

const cache = {};
function play(name, make, gain) {
  const audio = getAudioContext();
  if (!audio) return;
  if (!cache[name]) {
    const samples = make(audio.sampleRate);
    cache[name] = audio.createBuffer(1, samples.length, audio.sampleRate);
    cache[name].copyToChannel(samples, 0);
  }
  playBuffer(cache[name], { gain, rate: 0.97 + Math.random() * 0.06 });
}

export const playLighterOpen = () => play("open", (sr) => synthClink(sr, false), 0.16);
export const playLighterFlick = () => play("flick", synthFlick, 0.12);
export const playLighterClose = () => play("close", (sr) => synthClink(sr, true), 0.14);
