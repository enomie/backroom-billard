/**
 * The secret key of the multiplayer account (see _docs/konto-umbau.md): 20 characters of a 32 letter alphabet (no I, O, 0, 1) in five
 * groups of four, made up here in the browser (the random numbers of the database module can be guessed) and kept in localStorage.
 */
import { storageGet, storageSet, storageRemove } from "./storage.js";

const STORAGE_KEY = "backroom-billard.account-key";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KEY_PATTERN = /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){4}$/;

/** A new random key (100 bits). */
export function makeKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const letters = [...bytes].map((b) => ALPHABET[b & 31]); // (256 is a multiple of 32: every character is equally likely)
  return [0, 4, 8, 12, 16].map((i) => letters.slice(i, i + 4).join("")).join("-");
}

/** What a person typed or pasted → the key in its form (capitals, groups), or null if it is not a key. */
export function normalizeKey(text) {
  const plain = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (plain.length !== 20) return null;
  const key = [0, 4, 8, 12, 16].map((i) => plain.slice(i, i + 4)).join("-");
  return KEY_PATTERN.test(key) ? key : null;
}

/** @returns {string | null} the key of this browser's account */
export function loadKey() {
  const key = storageGet(STORAGE_KEY);
  return key && KEY_PATTERN.test(key) ? key : null;
}

/** The account of this browser is given up (a new one is made next time). */
export function clearKey() {
  storageRemove(STORAGE_KEY);
}

/** @param {string} key */
export function saveKey(key) {
  storageSet(STORAGE_KEY, key);
}
