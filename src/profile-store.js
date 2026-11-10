/**
 * What the browser keeps (localStorage; in memory if the browser does not allow it), see _docs/welcome-screen.md:
 * - the single player's purse: money, last drink, last pack. Single player is offline and has no name, flag or face.
 * - the last drink and pack chosen in multiplayer (the account itself, with name, country, face and money, lives in the database;
 *   the browser only keeps its key, see account-key.js).
 * - the old profile of earlier versions (name, country, face, money): read once, see loadLegacy.
 */
import { normalizeName, isValidName } from "./name-rules.js";

const SINGLE_KEY = "backroom-billard.single";
const MULTI_KEY = "backroom-billard.multi-choice";
const LEGACY_KEY = "backroom-billard.profile";

const memory = new Map(); // when localStorage is not available
const read = (key) => {
  try {
    const text = localStorage.getItem(key);
    if (text) return JSON.parse(text);
  } catch {
    /* not allowed or not JSON: the memory has it, if anything */
  }
  return memory.get(key) ?? null;
};
const write = (key, value) => {
  memory.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* not allowed: it stays in memory */
  }
};
const remove = (key) => {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to remove */
  }
};

/** @typedef {{ money: number, firstDrink: string | null, firstPack: number | null }} Purse */

/**
 * The old profile (an earlier version kept name, country, face, money and the choices in one entry): its name parts are brought into the
 * rules again (letters, at most 10 each). null if there is none or it is damaged.
 */
export function loadLegacy() {
  const p = read(LEGACY_KEY);
  if (!p || p.version !== 1 || typeof p.firstName !== "string" || typeof p.lastName !== "string" || !Number.isFinite(p.money)) return null;
  const clean = { ...p, firstName: normalizeName(p.firstName), middleName: normalizeName(typeof p.middleName === "string" ? p.middleName : ""), lastName: normalizeName(p.lastName) };
  return isValidName(clean.firstName, true) && isValidName(clean.lastName, true) && isValidName(clean.middleName, false) ? clean : null;
}
/** The old name, country and face are not needed any more (the account has them). */
export function clearLegacy() {
  remove(LEGACY_KEY);
}

/** @returns {Purse | null} the single player's purse; the first time it takes over what the old profile had (the money) */
export function loadSingle() {
  const own = read(SINGLE_KEY);
  if (own && Number.isFinite(own.money)) return own;
  const old = loadLegacy();
  return old ? { money: old.money, firstDrink: old.firstDrink ?? null, firstPack: Number.isInteger(old.firstPack) ? old.firstPack : null } : null;
}
/** @param {Purse} purse */
export function saveSingle(purse) {
  write(SINGLE_KEY, purse);
}
/** The money after a purchase: written at once (single player only). */
export function saveSingleMoney(money) {
  saveSingle({ ...(loadSingle() ?? { firstDrink: null, firstPack: null }), money });
}
/** Single player starts over: 15,000 $ again. */
export function clearSingle() {
  remove(SINGLE_KEY);
  remove(LEGACY_KEY);
}

/** @returns {{ firstDrink: string | null, firstPack: number | null } | null} the last choice at the bar in multiplayer */
export function loadMultiChoice() {
  return read(MULTI_KEY);
}
export function saveMultiChoice(choice) {
  write(MULTI_KEY, choice);
}
