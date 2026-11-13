/**
 * Look of the balls (see ball-texture.js and balls.js): colors, solids and stripes, the number circles
 * and small specks on the surface, like the inclusions of ivory balls, so that one sees how a ball turns.
 * Only optical.
 */
/** The seven colors of the balls 1–7 (solids); 9–15 (stripes) repeat them. No. 8 is black. */
const SET_COLORS = [
  0xf2b705, // 1 / 9 yellow
  0x0b3c8c, // 2 / 10 blue
  0xc8102e, // 3 / 11 red
  0x4b2a7b, // 4 / 12 purple
  0xf2681d, // 5 / 13 orange
  0x0b6b3a, // 6 / 14 green
  0x7a1f1f, // 7 / 15 maroon
];
const BLACK = 0x15151a;
/** Color of the ball by its number (1–15). The HUD uses the same colors. */
export const ballColor = (number) => (number === 8 ? BLACK : SET_COLORS[(number - 1) % 8]);
/** Stripes: 9–15. */
export const isStripe = (number) => number > 8;
/** The white of the cue ball, the stripes and the number circles. */
export const CUE_BALL_COLOR = 0xf6f1e4;
export const BALL_IVORY = 0xf3ecd9;
export const BALL_NUMBER_COLOR = "#141414";

/** Ball numbers in rack position order: the 8 in the middle of the third row, a solid and a stripe in the back corners. */
export const RACK_ORDER = [1, 10, 3, 14, 8, 6, 11, 7, 2, 13, 4, 9, 15, 5, 12];

/** Size of the texture of one ball (px, twice as wide as high: it wraps around the sphere). */
export const BALL_TEXTURE_WIDTH = 1024;
export const BALL_TEXTURE_HEIGHT = 512;
/** Half height of the stripe band (radians of latitude; about a third of the ball is colored). */
export const BALL_STRIPE_HALF_ANGLE = 0.5;
/** Angular radius of the white number circle (radians from its center; two circles, front and back). */
export const BALL_NUMBER_CIRCLE_ANGLE = 0.3;
/** Height of the number relative to the diameter of its circle, and its font. */
export const BALL_NUMBER_SIZE = 0.72;
export const BALL_NUMBER_FONT = '700 {size}px "Roboto", sans-serif';
/** Underline below 6 and 9 (relative to the circle diameter). */
export const BALL_NUMBER_UNDERLINE = { width: 0.36, height: 0.05, offset: 0.36 };

/** Specks per ball and their radius at the equator (px; 1 px is about 0.17 mm on the ball). */
export const BALL_SPECK_COUNT = 90;
export const BALL_SPECK_RADIUS_MIN = 2.4;
export const BALL_SPECK_RADIUS_MAX = 6.8;
/** How far a speck colors away from the color under it (0 = not at all, 1 = fully its own color). */
export const BALL_SPECK_STRENGTH_MIN = 0.4;
export const BALL_SPECK_STRENGTH_MAX = 0.8;
/** Speck colors: dark brown on light and colored balls, light grey-cream on dark ones. */
export const BALL_SPECK_COLOR_ON_LIGHT = [58, 44, 30];
export const BALL_SPECK_COLOR_ON_DARK = [150, 140, 125];
/** A ball darker than this (0..1) gets the light specks. */
export const BALL_DARK_LIMIT = 0.3;

/** Material of all balls (glossy phenolic resin with a clear coat). */
export const BALL_MATERIAL = {
  roughness: 0.03,
  metalness: 0.04,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  reflectivity: 0.98,
};
/** Segments of the sphere (around and from pole to pole). */
export const BALL_SEGMENTS = 32;
