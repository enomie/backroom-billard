/**
 * The concert grand piano (lid closed) and its stool, at the wall opposite the door, beside the
 * neon sign. All sizes in m. See _docs/piano.md.
 */
/** Position of the middle of the case: x along the short wall (0 = the middle, below the neon sign), distance from the wall surface. */
export const PIANO_X = 0;
export const PIANO_WALL_DISTANCE = 2.1;
/** Turn about the vertical axis (rad, 0 = the keyboard faces the room straight); 45° looks into the room's diagonal. */
export const PIANO_TURN = Math.PI / 4;

/** The case: width, length (keyboard end to tail), bottom and top height of the rim, lid thickness. */
export const PIANO_WIDTH = 1.55;
export const PIANO_LENGTH = 2.75;
export const PIANO_RIM_BOTTOM = 0.62;
export const PIANO_RIM_TOP = 0.98;
export const PIANO_LID_THICKNESS = 0.03;

/** Legs: radius at the top, at the foot, number is fixed (two at the front, one at the tail). */
export const PIANO_LEG_RADIUS_TOP = 0.045;
export const PIANO_LEG_RADIUS_FOOT = 0.03;

/** The keyboard: 52 white and 36 black keys (A0 to C8), the width of a white key, the visible length of the keys, the key slip (the shelf in front of the case). */
export const PIANO_WHITE_KEYS = 52;
export const PIANO_WHITE_KEY_WIDTH = 0.0235;
export const PIANO_WHITE_KEY_LENGTH = 0.15;
export const PIANO_BLACK_KEY_WIDTH = 0.0125;
export const PIANO_BLACK_KEY_LENGTH = 0.095;
export const PIANO_KEYS_TOP = 0.74; // height of the top of the white keys
export const PIANO_KEYBED_DEPTH = 0.3; // how far the keyboard block reaches out of the case

/** The stool: seat width, depth, height, thickness of the seat, radius of the legs (m). */
export const PIANO_STOOL_WIDTH = 0.55;
export const PIANO_STOOL_DEPTH = 0.32;
export const PIANO_STOOL_HEIGHT = 0.52;
export const PIANO_STOOL_SEAT_THICKNESS = 0.08;
export const PIANO_STOOL_LEG_RADIUS = 0.018;
/** Distance of the stool's middle from the front of the keyboard. */
export const PIANO_STOOL_DISTANCE = 0.4;

export const PIANO_COLOR_LACQUER = 0x07070a;
export const PIANO_COLOR_WHITE_KEY = 0xf1ecdc;
export const PIANO_COLOR_BLACK_KEY = 0x0b0b0c;
export const PIANO_COLOR_STOOL_SEAT = 0x1a1210;
export const PIANO_COLOR_BRASS = 0xb08d4a;
