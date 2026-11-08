/**
 * The piano's sound, made from scratch (no samples): every note is a few sine partials (slightly
 * stretched like real strings), the two lowest partials doubled and a little out of tune (the
 * strings of one note never agree), a soft knock of the hammer, a lowpass that opens with the
 * strength of the key. Higher notes ring shorter. Played from the piano's place in the room
 * (audio.js). Values: piano-constants.js; see _docs/piano.md.
 */
import { getAudioContext, createSoundPanner, getMasterNode } from "./audio.js";
import {
  PIANO_NOTE_GAIN,
  PIANO_DECAY_LOW,
  PIANO_DECAY_HIGH,
  PIANO_INHARMONICITY,
  PIANO_RELEASE_SECONDS,
  PIANO_MAX_VOICES,
  PIANO_DETUNE_CENTS,
} from "./piano-constants.js";

const LOWEST = 21; // A0
const HIGHEST = 108; // C8

/** @param {[number, number, number]} position — where the sound comes from */
export function createPianoSound(position) {
  let out = null; // the common output (compressor, panner)
  let noise = null; // a short noise buffer for the hammer
  let nextId = 1;
  const voices = new Map();

  function setup(audio) {
    const master = getMasterNode();
    if (!master) return false;
    const compressor = audio.createDynamicsCompressor(); // many notes at once stay clean
    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    const panner = createSoundPanner(audio, position);
    compressor.connect(panner);
    panner.connect(master);
    out = compressor;
    noise = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.06), audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return true;
  }

  function release(id) {
    const v = voices.get(id);
    if (!v) return;
    voices.delete(id);
    const now = v.audio.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.setTargetAtTime(0, now, PIANO_RELEASE_SECONDS / 3); // the damper falls on the strings
    for (const o of v.oscillators) o.stop(now + PIANO_RELEASE_SECONDS * 3);
  }

  return {
    /**
     * Start a note.
     * @param {number} midi — 21 (A0) to 108 (C8)
     * @param {number} velocity — 0…1
     * @returns {number} an id for noteOff (−1 if there is no sound)
     */
    noteOn(midi, velocity = 0.8) {
      const audio = getAudioContext();
      if (!audio || (!out && !setup(audio))) return -1;
      while (voices.size >= PIANO_MAX_VOICES) release(voices.keys().next().value);
      const pitch = (midi - LOWEST) / (HIGHEST - LOWEST); // 0 (low) … 1 (high)
      const f = 440 * 2 ** ((midi - 69) / 12);
      const t = audio.currentTime;
      const partials = Math.max(3, Math.round(9 - pitch * 6));
      const decay = PIANO_DECAY_LOW + (PIANO_DECAY_HIGH - PIANO_DECAY_LOW) * pitch;

      const voiceGain = audio.createGain();
      voiceGain.gain.value = PIANO_NOTE_GAIN * (0.35 + 0.65 * velocity);
      const tone = audio.createBiquadFilter(); // soft notes are darker
      tone.type = "lowpass";
      tone.frequency.value = Math.min(16000, f * (5 + 14 * velocity));
      tone.connect(voiceGain);
      voiceGain.connect(out);

      const oscillators = [];
      const stretch = PIANO_INHARMONICITY * (1 + 4 * (1 - pitch));
      for (let k = 1; k <= partials; k++) {
        const freq = f * k * Math.sqrt(1 + stretch * k * k);
        if (freq > 17000) break;
        const peak = (1 / k ** 1.15) * (0.55 + 0.45 * velocity) ** (k - 1);
        const ring = decay / (1 + 0.8 * (k - 1)); // the higher partials die first
        const detunes = k <= 2 ? [-PIANO_DETUNE_CENTS, PIANO_DETUNE_CENTS] : [0];
        for (const cents of detunes) {
          const osc = audio.createOscillator();
          osc.frequency.value = freq;
          osc.detune.value = cents;
          const g = audio.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(peak / detunes.length, t + 0.004);
          g.gain.setTargetAtTime(0, t + 0.004, ring / 3);
          osc.connect(g);
          g.connect(tone);
          osc.start(t);
          osc.stop(t + ring * 1.6 + 0.5); // long after it is inaudible
          oscillators.push(osc);
        }
      }
      // the knock of the hammer: a short, filtered burst of noise
      const knock = audio.createBufferSource();
      knock.buffer = noise;
      const band = audio.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = Math.min(5000, f * 3);
      band.Q.value = 0.8;
      const knockGain = audio.createGain();
      knockGain.gain.setValueAtTime(0.18 * velocity, t);
      knockGain.gain.setTargetAtTime(0, t, 0.01);
      knock.connect(band);
      band.connect(knockGain);
      knockGain.connect(voiceGain);
      knock.start(t);

      const id = nextId++;
      voices.set(id, { audio, gain: voiceGain, oscillators });
      oscillators[0].onended = () => {
        voices.delete(id);
        voiceGain.disconnect();
      };
      return id;
    },
    /** Let go of a note (the damper falls). */
    noteOff(id) {
      release(id);
    },
  };
}
