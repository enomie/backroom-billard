/** Small helpers for the procedural sound synthesis (shared by shot-sounds.js and collision-sounds.js). */

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Chamberlin state-variable bandpass with a per-sample center frequency (for sweeps).
 * @param {number} sampleRate
 * @param {number} q — quality factor (higher = narrower)
 */
export function bandpass(sampleRate, q) {
  let low = 0;
  let band = 0;
  const damping = 1 / q;
  return (input, centerHz) => {
    const f = 2 * Math.sin((Math.PI * Math.min(centerHz, sampleRate / 6)) / sampleRate);
    low += f * band;
    const high = input - low - damping * band;
    band += f * high;
    return band;
  };
}

/** One-pole lowpass on noise: slow random fluctuation (0..1-ish) for the stick-slip texture. */
export function slowNoise(sampleRate, cutoffHz) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
  let y = 0;
  return () => {
    y += a * (Math.random() * 2 - 1 - y);
    return y;
  };
}

/** Scale to the given peak and fade the first/last few ms (no clicks). */
export function finish(samples, sampleRate, peak = 0.9, fadeSeconds = 0.003) {
  let max = 0;
  for (const v of samples) max = Math.max(max, Math.abs(v));
  const scale = max > 0 ? peak / max : 0;
  const fade = Math.max(1, Math.floor(sampleRate * fadeSeconds));
  for (let i = 0; i < samples.length; i++) {
    let g = scale;
    if (i < fade) g *= i / fade;
    else if (i > samples.length - fade) g *= (samples.length - i) / fade;
    samples[i] *= g;
  }
  return samples;
}

