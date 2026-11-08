/**
 * The player's profile (name, first purchase, money), kept only in the browser (localStorage); there
 * is no database. If the browser does not allow it (private mode), the profile lives in memory for
 * this visit. See _docs/welcome-screen.md.
 */

const KEY = "backroom-billard.profile";
const VERSION = 1;

/** Used when localStorage is not available. */
let memory = null;

/**
 * @typedef {{ version: number, firstName: string, middleName: string, middleInitial: string,
 *   lastName: string, firstDrink: string, firstPack: number, money: number, createdAt: string }} Profile
 */

const isProfile = (p) =>
  p && p.version === VERSION && typeof p.firstName === "string" && typeof p.lastName === "string" && Number.isFinite(p.money);

/** @returns {Profile | null} the saved profile, or null for a new player */
export function loadProfile() {
  try {
    const text = localStorage.getItem(KEY);
    if (text) {
      const profile = JSON.parse(text);
      if (isProfile(profile)) return profile;
    }
  } catch {
    return memory;
  }
  return memory && isProfile(memory) ? memory : null;
}

/** @param {Profile} profile */
export function saveProfile(profile) {
  memory = profile;
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* not allowed: it stays in memory */
  }
}

/** The money after a purchase: written into the profile at once (nothing happens without a profile). */
export function saveMoney(money) {
  const profile = loadProfile();
  if (profile) saveProfile({ ...profile, money });
}

/** Start over: the profile is gone, the next one begins with the start money again. */
export function clearProfile() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to remove */
  }
}

export const PROFILE_VERSION = VERSION;
