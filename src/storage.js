/**
 * localStorage access that never throws: if the browser does not allow it (private window, blocked site data),
 * the values live in memory for this visit.
 */

const memory = new Map();

/** @returns {string | null} */
export function storageGet(key) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    /* not allowed: the memory has it, if anything */
  }
  return memory.get(key) ?? null;
}

/** @param {string} value */
export function storageSet(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* not allowed: it stays in memory */
  }
}

export function storageRemove(key) {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to remove */
  }
}
