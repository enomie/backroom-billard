/** The keys of the grand piano on the wire (see multiplayer.js): the 88 keys A0 (midi 21) to C8 (108) as bits, A0 first. */
export const PIANO_LOWEST_MIDI = 21;
export const PIANO_KEY_COUNT = 88;
export const PIANO_KEY_BYTES = 11; // (the database checks the same size)

/** @param {Iterable<number>} midis — the keys that are down */
export function encodeKeys(midis) {
  const bytes = new Uint8Array(PIANO_KEY_BYTES);
  for (const midi of midis) {
    const i = midi - PIANO_LOWEST_MIDI;
    if (i >= 0 && i < PIANO_KEY_COUNT) bytes[i >> 3] |= 1 << (i & 7);
  }
  return bytes;
}

/** @param {Uint8Array} bytes @returns {number[]} the midi numbers of the keys that are down */
export function decodeKeys(bytes) {
  const midis = [];
  for (let i = 0; i < PIANO_KEY_COUNT; i++) if (bytes[i >> 3] & (1 << (i & 7))) midis.push(PIANO_LOWEST_MIDI + i);
  return midis;
}
