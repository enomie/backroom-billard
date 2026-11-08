/** The bar (main module): stands opposite the radio, with a gap behind it for the bartender. See _docs/bar.md. */
import { RADIO_WALL_SIDE } from "./radio-constants.js";

/** The long wall the bar stands at: opposite the radio (x = ±ROOM_WIDTH/2). */
export const BAR_WALL_SIDE = -RADIO_WALL_SIDE;
/** Position along the wall (z, 0 = in line with the table center). */
export const BAR_WALL_Z = 0;
/** Distance from the wall to the back of the bar (m): room for the bartender. */
export const BAR_WALL_DISTANCE = 1;

/** Main module: width along the wall, depth towards the wall, total height (m). */
export const BAR_WIDTH = 3;
export const BAR_DEPTH = 0.6;
export const BAR_HEIGHT = 1.2;

/** Silver plinth: height and how far it is set back from the wooden block on every side (m). */
export const BAR_PLINTH_HEIGHT = 0.16;
export const BAR_PLINTH_INSET = 0.03;

/** Marble top: thickness, overhang over the wooden block on every side, radius of the rounded corners (m). */
export const BAR_TOP_THICKNESS = 0.04;
export const BAR_TOP_OVERHANG = 0.04;
export const BAR_TOP_CORNER_RADIUS = 0.07;
/** Rounding of the top's edges (m). */
export const BAR_TOP_EDGE_ROUND = 0.006;

export const BAR_COLOR_SILVER = 0xc9cdd1;
export const BAR_COLOR_WOOD = 0x6b4328;
export const BAR_COLOR_MARBLE = 0xf1eeea;
export const BAR_COLOR_MARBLE_VEIN = "90,92,98";

/** Drinks on the bar top: how many glasses and bottles, and the margin to the edge of the top (m). */
export const BAR_DRINKS_COUNT = 7;
export const BAR_BOTTLES_COUNT = 2;
export const BAR_DRINKS_MARGIN = 0.15;
export const BAR_DRINKS_SEED = 11;

/** Bar stools in front of the bar: number, distance of their middle from the bar's front, spacing along the bar (m). */
export const STOOL_COUNT = 3;
export const STOOL_DISTANCE = 0.4;
export const STOOL_SPACING = 0.8;
/** Seat height, seat radius and thickness, column radius, foot radius, foot rest height above the floor (m). */
export const STOOL_SEAT_HEIGHT = 0.78;
export const STOOL_SEAT_RADIUS = 0.17;
export const STOOL_SEAT_THICKNESS = 0.06;
export const STOOL_COLUMN_RADIUS = 0.025;
export const STOOL_FOOT_RADIUS = 0.2;
export const STOOL_RING_HEIGHT = 0.3;
export const STOOL_COLOR_SEAT = 0x5a1620;

/**
 * Back bar behind the bar: a marble wall against the long wall with three shelves for bottles.
 * Width, height and thickness of the marble; shelf levels (height above the floor), shelf width
 * (a little less than the marble), depth and thickness; gap between two bottles on a shelf (m).
 */
export const BACKBAR_WIDTH = 3.6;
export const BACKBAR_HEIGHT = 3;
export const BACKBAR_THICKNESS = 0.06;
/** Wooden frame (the wood of the wall paneling) on the left, right and top of the marble: width and depth (m). */
export const BACKBAR_FRAME_WIDTH = 0.07;
export const BACKBAR_FRAME_DEPTH = 0.08;
export const BACKBAR_SHELF_LEVELS = [1.45, 2.0, 2.55];
export const BACKBAR_SHELF_WIDTH = 3.2;
export const BACKBAR_SHELF_DEPTH = 0.22;
export const BACKBAR_SHELF_THICKNESS = 0.025;
export const BACKBAR_BOTTLE_GAP = 0.05;
export const BACKBAR_BOTTLE_SEED = 7;
/** The wall lamp on the bar's wall in front of the back bar is left out; lamps this close (m) to it go. */
export const BACKBAR_LAMP_CLEARANCE = 0.3;

/**
 * Shelf lighting: an LED strip under the front edge of each shelf and the soft light it throws on
 * the wall below (a faded plane, no real light: it costs nothing per pixel). Color, strip
 * thickness, height of the light on the wall (m) and its strength (0…1).
 */
/** Only the top shelves are lit (counted from the top). */
export const BACKBAR_LIT_SHELVES = 2;
export const BACKBAR_LED_COLOR = 0xffd08a;
export const BACKBAR_LED_THICKNESS = 0.012;
export const BACKBAR_LED_GLOW_HEIGHT = 0.45;
export const BACKBAR_LED_GLOW_OPACITY = 0.5;

/**
 * Gold rods on the front of the counter (the side of the stools): radius, distance between the
 * middles, margin to the left and right end and to the plinth and the top (m).
 */
export const BAR_RODS_RADIUS = 0.012;
export const BAR_RODS_SPACING = 0.075;
export const BAR_RODS_SIDE_MARGIN = 0.2;
export const BAR_RODS_END_MARGIN = 0.07;
export const BAR_COLOR_GOLD = 0xd9a93a;

/**
 * Lamps hanging over the front of the bar (the light is added in the shader of the materials like
 * the wall lamps', no real lights): count, spacing along the bar, distance in front of the bar's
 * front edge, height of the shade's middle (m), size of the shade relative to the ceiling lamps.
 */
export const BAR_LAMPS_COUNT = 3;
export const BAR_LAMPS_SPACING = 0.9;
export const BAR_LAMPS_FRONT = -0.3; // negative: over the counter (-0.3 = the middle of the top)
export const BAR_LAMPS_HEIGHT = 2.4;
export const BAR_LAMPS_SCALE = 0.6; // of the shade of the ceiling lamps (the same blue / golden shade)
