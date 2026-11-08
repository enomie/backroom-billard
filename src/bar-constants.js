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
export const BAR_HEIGHT = 1.3;

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
