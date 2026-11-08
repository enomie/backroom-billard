/**
 * WPA 9-foot pool table (Recommended Equipment Specifications) — meters.
 * @see https://wpapool.com/wp-content/uploads/2024/01/RECOMMENDED-EQUIPMENT-SPECIFICATIONS.pdf
 */

/** Playing surface 100″ × 50″ */
export const PLAY_L = 2.54;
export const PLAY_W = 1.27;

/** Where the white ball is placed (head spot): along the table, towards the player at the start. */
export const HEAD_SPOT_Z = PLAY_L * 0.28;

/** Felt playing surface height (common furniture height; the WPA specifies floor-to-rail separately) */
export const TABLE_H = 0.85;

export const BALL_DIAMETER = 0.05715;
export const BALL_RADIUS_REAL = BALL_DIAMETER / 2;

/** Cushion: nose line to cloth, 63.5 % of the ball diameter (WPA mid value) */
export const CUSHION_NOSE_TO_BED = 0.635 * BALL_DIAMETER;

/**
 * Cushion rubber (K-66 / typical): ~40 mm profile width, slight overhang onto the felt.
 * (WPA erlaubt 1,7/8″–2″ ≈ 48–51 mm.)
 */
export const CUSHION_PROFILE_WIDTH = 0.04;

/** The back of the rubber is vertical and reaches this far into the wood (no gap to the wooden wall). */
export const CUSHION_PROFILE_BOTTOM_OUTSET = 0.002;

/**
 * K-66 profile: the nose is on TOP (height `CUSHION_NOSE_TO_BED`), the rubber face
 * recedes downwards by this amount (foot of the face at the cloth).
 */
export const CUSHION_PROFILE_FACE_RECESS = 0.012;

/** Wooden frame outside the felt edge (tournament standard ~110 mm). */
export const RAIL_WOOD_DEPTH = 0.11;

/** Rounding of the wooden frame's edges. */
export const RAIL_EDGE_RADIUS = 0.012;

/** Sight marks ("diamonds") on the frame: mother-of-pearl rhombi, 3 between neighbouring pockets. */
export const DIAMOND_LENGTH = 0.026; // along the rail
export const DIAMOND_WIDTH = 0.015;
export const DIAMOND_HEIGHT = 0.0018;
export const DIAMONDS_PER_SPAN = 3;

/** Green playing plate (felt on a carrier): 5 mm thick; the pocket cup starts below it. */
export const FELT_BED_DEPTH = 0.005;

/** Pocket mouth, WPA mid value → cylinder approximation radius = mouth/2 */
const CORNER_MOUTH =
  (0.1143 + 0.1175) / 2;
const SIDE_MOUTH = (0.127 + 0.130175) / 2;

export const POCKET_R_CORNER = CORNER_MOUTH / 2;
export const POCKET_R_SIDE = SIDE_MOUTH / 2;

/** 0 = hole center exactly on the corner of the felt edge (sketch). */
export const POCKET_CORNER_OFFSET_FACTOR = 0;
/** 0 = hole center exactly on the felt edge (sketch). */
export const POCKET_SIDE_OFFSET_FACTOR = 0;
export const POCKET_OVERHANG_TOP = 0.02;
export const POCKET_DEPTH_BOTTOM = 0.15;

/**
 * Cushion ends at the pockets (facet): the back of the rubber (at the felt edge) ends at the round
 * hole, the nose is cut back. `k` = recess of the end face per meter of rubber depth
 * (k = 1 → 45°, k = 0,25 → ca. 14°).
 */
export const CUSHION_END_RECESS_CORNER = 1.0;
export const CUSHION_END_RECESS_SIDE = 0.25;

/** Table legs stand directly below the corner pocket cups; air gap between cup bottom and leg top. */
export const LEG_CUP_GAP = 0.02;
export const LEG_RADIUS_TOP = 0.075;
export const LEG_RADIUS_BOTTOM = 0.055;

/** Apron boards around the table (hide the pocket cups): thickness and height; top edge = bottom of the wooden frame. */
export const SKIRT_THICKNESS = 0.02;
export const SKIRT_HEIGHT = 0.4;
