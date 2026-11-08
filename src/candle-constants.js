import { pianoCandleSpot } from "./piano-constants.js";

/**
 * Candle holder with candle and flickering flame, one on every round table and one on the grand piano (meters).
 * See _docs/glass-objects.md. The holder sits roughly, but not exactly, in the table's middle.
 */

/** Candle: white wax. */
export const CANDLE_DIAMETER = 0.03;
export const CANDLE_HEIGHT = 0.13;
export const CANDLE_COLOR_WAX = 0xf1ecdf;

/** Holder: dark red glazed dish with a tube for the candle and a small knob on its side. */
export const HOLDER_COLOR = 0x5a0a14;
export const HOLDER_DISH_RADIUS = 0.065;
export const HOLDER_TUBE_RADIUS = 0.023;
export const HOLDER_TUBE_HEIGHT = 0.06;
export const HOLDER_KNOB_RADIUS = 0.012;

/** The holder is moved off the table's center by up to this much, in a random direction (fixed seed). */
export const CANDLE_OFFSET_MAX = 0.12;
export const CANDLE_SEED = 7;

/** Flame: warm glow and flicker. */
export const FLAME_HEIGHT = 0.03;
export const FLAME_RADIUS = 0.0075;
export const FLAME_COLOR = 0xffa040;
export const FLAME_GLOW_SIZE = 0.3; // size of the soft glow around the flame (m)
export const FLAME_GLOW_OPACITY = 0.45;

/**
 * Real light: only the few candles nearest to the camera get a point light (the scene already has
 * many lights); the others only glow. The light is weak and has a short reach.
 */
export const CANDLE_REAL_LIGHTS = 3;
export const CANDLE_LIGHT_COLOR = 0xff9a45;
export const CANDLE_LIGHT_INTENSITY = 0.5;
export const CANDLE_LIGHT_DISTANCE = 2.5;
export const CANDLE_LIGHT_DECAY = 2;
/** Seconds a light needs to fade out/in when it moves to another candle. */
export const CANDLE_LIGHT_FADE = 0.4;
/** The pool of real lights is reassigned this often (s). */
export const CANDLE_LIGHT_REASSIGN = 0.5;

/** Candles that do not stand on a round table: places { x, y, z } (the lid of the grand piano). */
export const CANDLE_EXTRA_SPOTS = [pianoCandleSpot()];
