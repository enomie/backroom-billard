/**
 * Round tables with club armchairs (meters). Positions are on the floor, origin = table center
 * of the billard table, x = room width, z = room length. See _docs/look.md.
 */

/** Round pedestal table. */
export const FURNITURE_TABLE_RADIUS = 0.4;
export const FURNITURE_TABLE_HEIGHT = 0.75;
export const FURNITURE_TABLE_PLATE_THICKNESS = 0.04;
export const FURNITURE_TABLE_BASE_RADIUS = 0.24;

/** Club armchair (front = +z, seat and back in leather, short wooden feet). */
export const CHAIR_WIDTH = 0.7;
export const CHAIR_DEPTH = 0.68;
export const CHAIR_SEAT_HEIGHT = 0.45;
export const CHAIR_BACK_HEIGHT = 0.88;
export const CHAIR_COLOR_LEATHER = 0x6b1420; // wine red
/** Distance of a chair's center from the table center. */
export const CHAIR_RING_RADIUS = 0.78;

/** The free camera stays this far (m) from a table's center: tables with their chairs are closed off. */
export const FURNITURE_KEEP_OUT_RADIUS = 1.5;

/**
 * The tables: position and the chairs around them as [angle in degrees around the table (0 = +z),
 * extra distance from the table (a chair pulled back)]. The chairs face the table center.
 */
export const FURNITURE_TABLES = [
  { x: -5.4, z: -11.2, chairs: [[20, 0], [140, 0.12], [250, 0]] },
  { x: 4.9, z: -10.6, chairs: [[-30, 0], [95, 0], [200, 0.1]] },
  { x: -5.0, z: -4.8, chairs: [[60, 0], [190, 0.15]] },
  { x: 5.3, z: -4.9, chairs: [[-80, 0.1], [40, 0], [165, 0]] },
  { x: -5.5, z: 4.6, chairs: [[-20, 0], [110, 0], [235, 0.12]] },
  { x: 5.0, z: 5.6, chairs: [[10, 0.1], [130, 0], [255, 0]] },
  { x: -4.9, z: 11.0, chairs: [[-60, 0], [75, 0.1], [200, 0]] },
  { x: 5.4, z: 11.4, chairs: [[30, 0], [160, 0], [280, 0.12]] },
];
