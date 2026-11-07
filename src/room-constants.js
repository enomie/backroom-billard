/**
 * Room and lighting parameters (meters). See _docs/look.md.
 * Heights are measured above the floor (y = 0).
 */

/** Number of identical ceiling lamps above the table (arranged along the table length). */
export const LAMP_COUNT = 3;

/** Height of the lamp shade's lower rim above the floor. Changing it moves all lamps together. */
export const LAMP_HEIGHT = 2.4;

/** Distance between neighbouring lamps along the table length. */
export const LAMP_SPACING = 0.85;

/** Cable length above the shade; long enough to always stick out through the ceiling. */
export const LAMP_CABLE_LENGTH = 10;

/** Cone shade (apex up, open at the bottom). */
export const LAMP_SHADE_RADIUS = 0.24;
export const LAMP_SHADE_HEIGHT = 0.2;

/** Colors: blue outside, golden inside, black cable. */
export const LAMP_COLOR_OUTSIDE = 0x1d4ed8;
export const LAMP_COLOR_INSIDE = 0xd4a017;
export const LAMP_COLOR_CABLE = 0x050505;

/** Spot light of each lamp. */
export const LAMP_LIGHT_COLOR = 0xffd9a0;
export const LAMP_LIGHT_INTENSITY = 3.6;
export const LAMP_LIGHT_ANGLE = 0.45; // half opening angle in radians (~26°)
export const LAMP_LIGHT_PENUMBRA = 0.5;
export const LAMP_LIGHT_DECAY = 1.4;
export const LAMP_LIGHT_DISTANCE = 6;
export const LAMP_SHADOW_MAP_SIZE = 1024;
export const LAMP_SHADOW_RADIUS = 4; // soft shadow edge
