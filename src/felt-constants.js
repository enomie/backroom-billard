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
 * The worn head spot: lighter and greyer (the nap is pressed flat), a little smoother, so it
 * shimmers faintly under the lamps. radius (m) is where it is half as strong; strength 0..1.
 */
export const FELT_WEAR = {
  x: 0,
  z: HEAD_SPOT_Z,
  radius: 0.13,
  strength: 0.6,
  color: [44, 96, 78],
  roughness: 0.58,
};

/**
 * Water stains, very faint: inside a little lighter and greyer (pigment washed out), a fine, uneven
 * ring at the edge (where the water stopped), a little darker and, for red wine, with a hint of red.
 * They do not shine (matt). x, z, radius in m.
 */
export const FELT_STAINS = [
  { x: 0.31, z: 0.36, radius: 0.1, lift: 0.28, rim: 0.3, rimColor: [24, 52, 42] },
  { x: -0.27, z: -0.58, radius: 0.13, lift: 0.22, rim: 0.34, rimColor: [34, 50, 42] }, // a hint of wine
  { x: 0.4, z: -0.84, radius: 0.07, lift: 0.3, rim: 0.28, rimColor: [22, 54, 44] },
];
export const FELT_STAIN_LIFT_COLOR = [26, 78, 62];
export const FELT_STAIN_ROUGHNESS = 1;
