/**
 * The rules for the player's name (see _docs/welcome-screen.md): only letters (of any alphabet), the
 * dot and the hyphen; the middle name may be left empty and may be written out ("Theodor") or as an
 * initial ("T."): the short form "T." is always derived from it. Pure functions, no DOM.
 */

/** The longest part of a name (characters); the database checks the same limit (spacetime/src/index.ts). */
export const NAME_MAX_LENGTH = 10;

const LETTER = /^\p{L}$/u;
const isLetter = (c) => LETTER.test(c);

/**
 * Keep what may be typed: letters, a dot after a letter, a hyphen after a letter or a dot (never at the
 * start, never twice in a row). Everything else is dropped, also what would break these rules.
 * @param {string} value
 * @returns {string}
 */
export function filterName(value) {
  let out = "";
  for (const c of [...value]) {
    const last = out.at(-1);
    if (out.length >= NAME_MAX_LENGTH) break;
    if (isLetter(c)) out += c;
    else if (c === "." && last && isLetter(last)) out += c;
    else if (c === "-" && last && (isLetter(last) || last === ".")) out += c;
  }
  return out;
}

/**
 * The finished form of a part of a name: the first letter, and the one after a hyphen, in capitals
 * (the rest stays as typed, so "McDonald" survives), no hyphen at the end.
 * @param {string} value
 */
export function normalizeName(value) {
  let out = filterName(value).replace(/-+$/, "");
  out = out.replace(/(^|-)(\p{L})/gu, (_, dash, letter) => dash + letter.toLocaleUpperCase());
  return out;
}

/**
 * @param {string} value — an already normalized part of a name
 * @param {boolean} required — first and last name: at least one letter; the middle name may be empty
 */
export function isValidName(value, required) {
  if (!value) return !required;
  return [...value].some(isLetter) && value === filterName(value) && !value.endsWith("-");
}

/**
 * The short form of a middle name: the first letter of each part, in capitals, with a dot.
 * "Theodor" → "T.", "t" → "T.", "T." → "T.", "Jean-Luc" → "J.-L.", "" → "".
 * @param {string} middle
 */
export function middleInitial(middle) {
  return middle
    .split("-")
    .map((part) => [...part].find(isLetter))
    .filter(Boolean)
    .map((letter) => letter.toLocaleUpperCase() + ".")
    .join("-");
}

/**
 * The name for the place where it is shown.
 *   "full":     Anna Theodor Meier  (where there is room: the settings)
 *   "short":    Anna T. Meier       (where it is tight: HUD, lists)
 *   "initials": A. T. M.            (where it is very tight)
 * @param {{ firstName: string, middleName?: string, lastName: string }} profile
 * @param {"full" | "short" | "initials"} form
 */
export function displayName(profile, form = "full") {
  if (!profile) return "";
  const middle = profile.middleName ?? "";
  if (form === "initials") return [middleInitial(profile.firstName), middleInitial(middle), middleInitial(profile.lastName)].filter(Boolean).join(" ");
  return [profile.firstName, form === "short" ? middleInitial(middle) : middle, profile.lastName].filter(Boolean).join(" ");
}
