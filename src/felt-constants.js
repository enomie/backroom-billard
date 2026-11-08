/**
 * The cloth of the table (see felt-texture.js): the color of the bare cloth as before, a worn place at
 * the head spot where the white ball is put, and a few faint water stains (red wine that was washed
 * out in vain). Always the same look. Only optical.
 */
import { HEAD_SPOT_Z } from "./table-constants.js";

/** Size of the textures (px) for the whole cloth. */
export const FELT_TEXTURE_WIDTH = 1024;
export const FELT_TEXTURE_HEIGHT = 512;

/** The new cloth: the color (as before 0x0a4032), the fine unevenness of the nap (±, 0..255) and the roughness (matt). */
export const FELT_COLOR = [10, 64, 50];
export const FELT_NAP_NOISE = 2;
export const FELT_ROUGHNESS = 0.9;

/**
 * The head spot where the white ball is put. Two things: a small, lumpy hole where the cloth is
 * worn through and the dark backing shows (WEAR), and around it a larger, washed-out place where the
 * nap is flattened: lighter, greyer and a little smoother, so it shimmers faintly under the lamps
 * (WASH). x, z and radius in m (a ball has a radius of 0.0286); lobes 0..1 = how lumpy the outline is.
 */
export const FELT_WEAR = {
  x: 0.01,
  z: HEAD_SPOT_Z - 0.008,
  radius: 0.014,
  aspect: 1.2,
  rotation: 0.5,
  lobes: 0.34,
  color: [3, 27, 22],
  strength: 0.9,
  roughness: 0.95,
};
export const FELT_WASH = {
  x: 0,
  z: HEAD_SPOT_Z,
  radius: 0.075,
  aspect: 1.3,
  rotation: 0.2,
  lobes: 0.35,
  strength: 0.28,
  color: [44, 96, 78],
  roughness: 0.62,
};

/**
 * Water stains, very faint, and irregular like a puddle that ran: a lumpy outline (lobes), a long
 * form (aspect, rotation in rad), inside a little lighter and greyer (pigment washed out), at the
 * edge an uneven, in places missing ring (where the water stopped) with a second, fainter one inside,
 * a little darker and, for red wine, with a hint of red. They do not shine (matt). x, z, radius in m.
 */
export const FELT_STAINS = [
  { x: 0.31, z: 0.36, radius: 0.1, aspect: 1.5, rotation: 0.6, lobes: 0.4, lift: 0.28, rim: 0.34, rimColor: [24, 52, 42] },
  { x: -0.27, z: -0.58, radius: 0.12, aspect: 1.25, rotation: -0.4, lobes: 0.5, lift: 0.22, rim: 0.38, rimColor: [36, 50, 42] }, // a hint of wine
  { x: 0.4, z: -0.84, radius: 0.065, aspect: 1.8, rotation: 1.1, lobes: 0.42, lift: 0.3, rim: 0.32, rimColor: [22, 54, 44] },
];
export const FELT_STAIN_LIFT_COLOR = [26, 78, 62];
export const FELT_STAIN_ROUGHNESS = 1;
