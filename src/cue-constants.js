/**
 * Cue animation while the balls roll (and while flying with the free camera): the cue is held
 * relaxed in the lower right of the view, tip pointing diagonally into the scene — butt end
 * towards the player. Positions are relative to the camera (meters, camera looks along −z).
 */

/** The cue stays at the ball for this long after the strike (follow-through, seconds). */
export const CUE_FOLLOW_THROUGH_TIME = 0.35;
/** Duration of the swing into the relaxed hold, and of the way back to the aiming pose (seconds). */
export const CUE_RELAX_TIME = 0.9;
export const CUE_RETURN_TIME = 0.6;

/** Tip position in camera space: right, down, forward (negative z). */
export const CUE_CARRY_TIP = [0.12, -0.12, -1.35];
/** Direction from the tip towards the butt in camera space (towards the player, right and down). */
export const CUE_CARRY_DIRECTION = [0.75, 0.1, 0.55];

/** Gentle idle sway of the held cue (radians, rad/s). */
export const CUE_SWAY_AMPLITUDE = 0.03;
export const CUE_SWAY_SPEED = 1.6;
