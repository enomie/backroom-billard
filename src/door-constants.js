/**
 * The old double swing door in the short wall behind the player at the start (z = +ROOM_LENGTH / 2):
 * a dummy, it does not open and nothing lies behind it (meters). See _docs/look.md.
 */

/** The opening in the wall, centered on x = 0, from the floor up. */
export const DOOR_OPENING_WIDTH = 1.7;
export const DOOR_OPENING_HEIGHT = 2.15;
/** Thickness of the wall: depth of the reveal in which the door hangs. */
export const DOOR_WALL_DEPTH = 0.25;
/** Slits between the two leaves, between the leaves and the frame, above the sill (0 = the door fits exactly). */
export const DOOR_GAP = 0;
export const DOOR_SILL_HEIGHT = 0.02;
/** Trim boards around the opening on the room side. */
export const DOOR_CASING_WIDTH = 0.09;
export const DOOR_CASING_DEPTH = 0.04;

/**
 * Layout of one leaf (m): stiles at the sides, top rail, the glass field (3 × 3 panes), mid rail, bottom
 * rail; the two raised panels fill what is left below the mid rail.
 */
export const DOOR_LEAF_THICKNESS = 0.045;
export const DOOR_STILE = 0.1;
export const DOOR_TOP_RAIL = 0.12;
export const DOOR_GLASS_HEIGHT = 1.08;
export const DOOR_MID_RAIL = 0.14;
export const DOOR_BOTTOM_RAIL = 0.26;
export const DOOR_PANEL_STILE = 0.09;
export const DOOR_MUNTIN = 0.022;
export const DOOR_MUNTIN_DEPTH = 0.03;
export const DOOR_PANEL_THICKNESS = 0.016;

/** Slanted push bars on the room side: horizontal run and rise (m), rod radius, distance from the leaf. */
export const DOOR_BAR_RUN = 0.27;
export const DOOR_BAR_RISE = 0.36;
export const DOOR_BAR_RADIUS = 0.014;
export const DOOR_BAR_STANDOFF = 0.04;

/** Strap hinges at the outer edge of each leaf: count, plate length (m). */
export const DOOR_HINGES = 3;
export const DOOR_HINGE_PLATE = 0.14;

/** The wall of light behind the glass (a flat plate at the back of the reveal). */
export const DOOR_BACKDROP_COLOR = 0xffe7bd;

/** Black iron, dark bronze bars (the wood is the wood of the wall paneling). */
export const DOOR_COLOR_IRON = 0x1c1a18;
export const DOOR_COLOR_BRONZE = 0x8a6030;

/** Amber, see-through, wavy glass: tint, opacity, how strongly the waves bend the highlights, glow (the glass shines a little by itself). */
export const DOOR_GLASS_COLOR_BASE = "#c97a10";
export const DOOR_GLASS_COLOR_LIGHT = "#f5c060";
export const DOOR_GLASS_COLOR_DARK = "#8a4a06";
export const DOOR_GLASS_OPACITY = 0.74;
export const DOOR_GLASS_WAVE_STRENGTH = 1.1;
export const DOOR_GLASS_GLOW = 0xa8590a;
export const DOOR_GLASS_GLOW_INTENSITY = 0.5;

/** The mirrored golden "B" on one pane of the left leaf, the normal "B" on the same pane of the right leaf (row, column from 0 at the top left of the leaf). */
export const DOOR_LOGO_ROW = 1;
export const DOOR_LOGO_COLUMN = 1;
export const DOOR_LOGO_SIZE = 0.8; // fraction of the pane width
export const DOOR_LOGO_COLOR_LIGHT = "#fff1a8";
export const DOOR_LOGO_COLOR_MID = "#e0aa28";
export const DOOR_LOGO_COLOR_DARK = "#7d5208";
