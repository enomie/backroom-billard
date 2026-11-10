/**
 * The face of a player: a few random choices from small palettes and a handful of shapes, drawn as a
 * small flat SVG (the preview on the welcome screen). Everything is random, nothing is typed in.
 * A face is plain data and is kept in the profile. See _docs/welcome-screen.md.
 */

/** Skin tones, from light to dark. */
export const SKIN = ["#f6d7c3", "#efc29f", "#e0a77c", "#c98a5b", "#a96a3d", "#7d4a2a", "#5a3420", "#3d2415"];
/** Hair, beard and eyebrows: natural colours and a few funny ones (the funny ones are rare, see FUNNY_HAIR_CHANCE). */
export const HAIR = ["#1b1613", "#3a2417", "#6b4226", "#8a3b1d", "#d9b45a", "#ecd58f", "#b9b7b3", "#efefef"];
export const FUNNY_HAIR = ["#2a6fdb", "#2faa5a", "#f28a1c", "#ff6fb5", "#8a4fd0"];
export const EYES = ["#5a3a22", "#2b1d14", "#3b78c9", "#3d9b5a", "#7d8a94", "#8a6a2c"];
const FUNNY_HAIR_CHANCE = 0.2;
const BEARD_CHANCE = 0.45; // otherwise no beard (the faces are for everybody)

/** Shapes: how many variants of each (0 is the first). */
const HAIR_STYLES = 6; // 0 bald, 1 buzz, 2 short, 3 side part, 4 long, 5 tuft
const BEARDS = 4; // 0 none, 1 stubble, 2 goatee, 3 full
const NOSES = 3; // small, medium, long
const BROWS = 3; // flat, arched, angled
const WIDTH_MIN = 0.86; // narrow … wide (not extreme)
const WIDTH_MAX = 1.08;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const int = (n) => Math.floor(Math.random() * n);

/** @typedef {{ skin: string, eyes: string, hair: string, width: number, hairStyle: number, beard: number, nose: number, brows: number }} Face */

/** @returns {Face} */
export function randomFace() {
  const hairStyle = int(HAIR_STYLES);
  return {
    skin: pick(SKIN),
    eyes: pick(EYES),
    hair: Math.random() < FUNNY_HAIR_CHANCE ? pick(FUNNY_HAIR) : pick(HAIR),
    width: WIDTH_MIN + Math.random() * (WIDTH_MAX - WIDTH_MIN),
    hairStyle,
    beard: Math.random() < BEARD_CHANCE ? 1 + int(BEARDS - 1) : 0,
    nose: int(NOSES),
    brows: int(BROWS),
  };
}

/** True if `face` is a face made by this file (a saved profile can be old or changed by hand). */
export function isFace(face) {
  const inRange = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
  return (
    !!face &&
    SKIN.includes(face.skin) &&
    EYES.includes(face.eyes) &&
    [...HAIR, ...FUNNY_HAIR].includes(face.hair) &&
    Number.isFinite(face.width) &&
    face.width >= WIDTH_MIN - 1e-6 &&
    face.width <= WIDTH_MAX + 1e-6 &&
    inRange(face.hairStyle, HAIR_STYLES) &&
    inRange(face.beard, BEARDS) &&
    inRange(face.nose, NOSES) &&
    inRange(face.brows, BROWS)
  );
}

/** A colour a bit darker (for the nose, the ears' shade and the mouth). */
export function darker(hex, amount = 0.18) {
  const n = parseInt(hex.slice(1), 16);
  const part = (shift) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${part(16)},${part(8)},${part(0)})`;
}

/**
 * The face as an SVG string (100 × 100, head in the middle).
 * @param {Face} face
 */
export function faceSvg(face) {
  const rx = 26 * face.width;
  const [L, R] = [50 - rx, 50 + rx];
  const hair = face.hair;
  const shade = darker(face.skin);
  const brow = (side) => {
    const [outer, inner] = [50 + side * 15, 50 + side * 4];
    const d = [`M${outer},38 L${inner},38`, `M${outer},39.5 Q${50 + side * 9.5},35 ${inner},39.5`, `M${outer},36 L${inner},40.5`][face.brows];
    return `<path d="${d}" stroke="${hair}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
  };
  const eye = (side) => `<ellipse cx="${50 + side * 9.5}" cy="46" rx="4.6" ry="3.3" fill="#fff"/><circle cx="${50 + side * 9.5}" cy="46" r="2.3" fill="${face.eyes}"/><circle cx="${50 + side * 9.5}" cy="46" r="1" fill="#111"/>`;
  const nose = [
    `<ellipse cx="50" cy="58" rx="3" ry="2.6" fill="${shade}"/>`,
    `<path d="M50,49 L46.5,60 Q50,63.5 53.5,60Z" fill="${shade}"/>`,
    `<path d="M50,46 L45.5,62 Q50,67 54.5,62Z" fill="${shade}"/>`,
  ][face.nose];
  // hair behind the head (long hair) and on top of it
  const behind = face.hairStyle === 4 ? `<path d="M${L - 3},42 C${L - 6},8 ${R + 6},8 ${R + 3},42 L${R + 5},94 L${L - 5},94Z" fill="${hair}"/>` : "";
  const top = [
    "",
    `<path d="M${L},44 C${L},18 ${R},18 ${R},44 C${R - 2},34 ${L + 2},34 ${L},44Z" fill="${hair}"/>`,
    `<path d="M${L - 1},48 C${L - 3},10 ${R + 3},10 ${R + 1},48 C${R - 3},30 ${L + 3},30 ${L - 1},48Z" fill="${hair}"/>`,
    `<path d="M${L - 1},48 C${L - 4},8 ${R + 4},8 ${R + 1},48 C${R - 2},26 42,24 ${L + 5},38 C${L + 4},42 ${L + 1},46 ${L - 1},48Z" fill="${hair}"/>`,
    `<path d="M${L - 1},50 C${L - 3},10 ${R + 3},10 ${R + 1},50 C${R - 3},30 ${L + 3},30 ${L - 1},50Z" fill="${hair}"/>`,
    `<path d="M${L},44 C${L},18 ${R},18 ${R},44 C${R - 2},34 ${L + 2},34 ${L},44Z" fill="${hair}"/><path d="M43,22 Q50,0 57,22Z" fill="${hair}"/>`,
  ][face.hairStyle];
  const beard = [
    "",
    `<path d="M${L + 2},56 C${L + 4},88 ${R - 4},88 ${R - 2},56 C${R - 8},66 ${L + 8},66 ${L + 2},56Z" fill="${hair}" opacity="0.35"/>`,
    `<path d="M41,66 Q50,60 59,66 Q50,64 41,66Z" fill="${hair}"/><path d="M43,74 Q50,88 57,74 Q50,78 43,74Z" fill="${hair}"/>`,
    `<path d="M${L},54 C${L},94 ${R},94 ${R},54 C${R - 6},66 ${L + 6},66 ${L},54Z" fill="${hair}"/>`,
  ][face.beard];
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
  ${behind}
  <ellipse cx="${L + 0.5}" cy="52" rx="3" ry="6" fill="${shade}"/><ellipse cx="${R - 0.5}" cy="52" rx="3" ry="6" fill="${shade}"/>
  <ellipse cx="50" cy="52" rx="${rx}" ry="34" fill="${face.skin}"/>
  ${beard}
  <path d="M43.5,71 Q50,75 56.5,71" stroke="${face.beard >= 2 ? "#f2c9c9" : darker(face.skin, 0.4)}" stroke-width="2" stroke-linecap="round" fill="none"/>
  ${nose}${eye(-1)}${eye(1)}${brow(-1)}${brow(1)}
  ${top}
</svg>`;
}
