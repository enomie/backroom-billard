import { ROOM_LENGTH } from "./room-constants.js";

/**
 * The concert grand piano (lid closed) and its stool, at the wall opposite the door, beside the
 * neon sign. All sizes in m. See _docs/piano.md.
 */
/** Position of the middle of the case: x along the short wall (0 = the middle, below the neon sign), distance from the wall surface. */
export const PIANO_X = 0;
export const PIANO_WALL_DISTANCE = 4.1;
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

/** Where the candle stands on the lid (in the piano's frame: x to the right of the keyboard, z towards the keyboard), off center. */
export const PIANO_CANDLE_LOCAL = [0.32, 0.1];
/** The candle's place in the room: [{ x, y, z }] (y = the top of the lid). */
export function pianoCandleSpot() {
  const [lx, lz] = PIANO_CANDLE_LOCAL;
  const cos = Math.cos(PIANO_TURN);
  const sin = Math.sin(PIANO_TURN);
  return {
    x: PIANO_X + lx * cos + lz * sin,
    y: PIANO_RIM_TOP + PIANO_LID_THICKNESS + 0.004,
    z: -ROOM_LENGTH / 2 + PIANO_WALL_DISTANCE - lx * sin + lz * cos,
  };
}

/** Playing: the keys can be pressed with the mouse (crosshair in the free camera) up to this far (m); the angle a pressed key tips by (rad). */
export const PIANO_CLICK_DISTANCE = 5;
export const PIANO_KEY_PRESS_ANGLE = 0.05;
/**
 * The sound (additive: a few sine partials, slightly stretched, two strings a little out of tune,
 * a soft hammer knock). Level of one note, the lowest and highest decay time of the ring (s), the
 * stretching of the partials (inharmonicity) at the bottom, the time a released note dies in (s),
 * most notes at once, and the highest note that gets as many partials as the lowest.
 */
export const PIANO_NOTE_GAIN = 0.16;
export const PIANO_DECAY_LOW = 7;
export const PIANO_DECAY_HIGH = 1.2;
export const PIANO_INHARMONICITY = 0.0002;
export const PIANO_RELEASE_SECONDS = 0.18;
export const PIANO_MAX_VOICES = 32;
export const PIANO_DETUNE_CENTS = 1.6;

/**
 * Close to the keyboard (m, along the floor, free camera) a button (F) offers to sit down at the
 * piano; seated, the computer keyboard plays it. The eye height when seated (m above the floor),
 * how far in front of the keyboard's middle the eyes are, and how long the camera takes to get there (s).
 */
export const PIANO_ENTER_DISTANCE = 2.5;
export const PIANO_SEAT_EYE_HEIGHT = 1.3;
export const PIANO_SEAT_BACK = 0.75;
export const PIANO_SEAT_SECONDS = 0.9;
/**
 * The computer keyboard plays the piano while seated. Each key: the semitones above the middle C (C4).
 * Two rows like a piano: the lower one (Z S X D C V G B H N J M , L . ; /) from C4, the upper one
 * (Q 2 W 3 E R 5 T 6 Y 7 U I 9 O 0 P [ = ]) from C5.
 */
export const PIANO_COMPUTER_KEYS = {
  KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11,
  Comma: 12, KeyL: 13, Period: 14, Semicolon: 15, Slash: 16,
  KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17, Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23,
  KeyI: 24, Digit9: 25, KeyO: 26, Digit0: 27, KeyP: 28, BracketLeft: 29, Equal: 30, BracketRight: 31,
};
export const PIANO_MIDDLE_C = 60;
