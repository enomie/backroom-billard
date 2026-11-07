/**
 * Glass ashtrays (meters): on some of the round tables and two on the wooden frame of the
 * billard table, one per player. See _docs/glass-objects.md.
 */

/** Table ashtray: diameter 14 cm, 3 cm high, 5 notches in the rim for cigarettes. */
export const ASHTRAY_RADIUS = 0.07;
export const ASHTRAY_HEIGHT = 0.03;
export const ASHTRAY_NOTCHES = 5;
export const ASHTRAY_NOTCH_DEPTH = 0.008;
/** Half width of a notch as an angle (rad). */
export const ASHTRAY_NOTCH_HALF_ANGLE = 0.15;

/** Height of the dish floor inside (m). */
export const ASHTRAY_FLOOR = 0.0095;

/** Glass: slightly green, mostly clear. */
export const ASHTRAY_COLOR = 0xb9d6d0;
export const ASHTRAY_OPACITY = 0.45;

/** On the frame of the billard table the ashtray is smaller (the frame is only 11 cm wide). */
export const ASHTRAY_FRAME_SCALE = 0.65;
/** Distance of the frame ashtrays from the table's middle along the long side (between the last diamond and the corner pocket). */
export const ASHTRAY_FRAME_Z = 1.14;

/** Share of the round tables that have an ashtray, its distance from the table center and the seed. */
export const ASHTRAY_TABLE_SHARE = 0.65;
export const ASHTRAY_TABLE_RING = 0.25;
export const ASHTRAY_SEED = 11;
