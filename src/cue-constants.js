/**
 * Cue animation while the balls roll (and while flying with the free camera): the cue is held
 * relaxed in front of the player — the butt end at the bottom of the screen, the tip above it,
 * almost upright, leaning slightly to the right (~8° from vertical on screen). Positions are relative to the camera
 * (meters, the camera looks along −z).
 */

/** The cue stays at the ball for this long after the strike (follow-through, seconds). */
export const CUE_FOLLOW_THROUGH_TIME = 0.35;
/** Duration of the swing into the relaxed hold, and of the way back to the aiming pose (seconds). */
export const CUE_RELAX_TIME = 0.9;
export const CUE_RETURN_TIME = 0.6;

/** Tip position in camera space: right, up, forward (negative z) — close to the camera, upper right. */
export const CUE_CARRY_TIP = [0.28, 0.3, -0.9];
/** Direction from the tip towards the butt: mostly down, slightly towards the player and to the left. */
export const CUE_CARRY_DIRECTION = [-0.2, -0.96, 0.2];

/** Gentle idle sway of the held cue (radians, rad/s). */
export const CUE_SWAY_AMPLITUDE = 0.03;
export const CUE_SWAY_SPEED = 1.6;

/* ---- Shot animation: draw back, hold, snap forward ------------------------------------------ */

/** Gap between the tip and the ball surface while aiming (m): the tip rests close to the ball. */
export const CUE_AIM_GAP = 0.012;
/** Draw-back gap at the weakest and the strongest power (m). */
export const CUE_BACK_GAP_MIN = 0.08;
export const CUE_BACK_GAP_MAX = 0.34;
/** Time to draw the cue back (s), weakest → strongest power. */
export const CUE_BACK_TIME_MIN = 0.25;
export const CUE_BACK_TIME_MAX = 0.55;
/** Short pause at the back point (s), weakest → strongest power. */
export const CUE_HOLD_TIME_MIN = 0.05;
export const CUE_HOLD_TIME_MAX = 0.2;
/** The cue keeps moving this far past the contact point (m), then stops. */
export const CUE_FOLLOW_DISTANCE = 0.02;
/**
 * Effective restitution of the tip–ball impact: the ball leaves with (1 + e) × cue speed, so the
 * cue speed is chosen as ballSpeed / (1 + e). The tip does not bounce (CUE_TIP_RESTITUTION = 0).
 */
export const CUE_STRIKE_RESTITUTION = 0;
/** Physics sub-steps per tick while the cue snaps forward and hits (finer = more accurate hit). */
export const CUE_STROKE_SUBSTEPS = 8;
