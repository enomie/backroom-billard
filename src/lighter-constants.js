/**
 * The two Zippo-style flip-top lighters, one per player on the billard table frame (meters).
 * See _docs/cigarettes.md.
 */
/** Size of a lighter standing upright: width, depth, height of the case, height of the lid. */
export const LIGHTER_WIDTH = 0.038;
export const LIGHTER_DEPTH = 0.013;
export const LIGHTER_CASE_HEIGHT = 0.04;
export const LIGHTER_LID_HEIGHT = 0.018;
/** How far the lid is opened (rad). */
export const LIGHTER_LID_ANGLE = 1.85;
/** Brushed metal: the first player's lighter is silver, the second one's gold. */
export const LIGHTER_COLORS = [0xc9c9ce, 0xd4a93c];
/** Where they lie on the frame: along z (between the side pocket and the first diamond), per player side −1 / +1. */
export const LIGHTER_FRAME_Z = 0.2;
/** Height of the flame above the chimney. */
export const LIGHTER_FLAME_HEIGHT = 0.024;
