/**
 * Physics parameters (Rapier). Values and rationale: _docs/physics.md
 */

/** Gravitational acceleration (m/s²). */
export const GRAVITY = 9.81;

/** Fixed simulation time step (240 Hz). */
export const PHYSICS_STEP = 1 / 240;

/** Cushion (K-66 rubber) */
export const CUSHION_RESTITUTION = 0.8;
export const CUSHION_FRICTION = 0.2;
export const CONTACT_SKIN_M = 0.001;

/** Ball (Aramith, phenolic resin) */
export const BALL_MASS_KG = 0.17;
export const BALL_RESTITUTION = 0.95;
export const BALL_FRICTION = 0.06;
/** Rapier's damping is proportional to the speed (slow balls would creep for seconds); the cloth's drag is applied in applyClothDrag instead. */
export const LINEAR_DAMPING = 0;
export const ANGULAR_DAMPING = 0;

/**
 * Cloth drag, applied per step to every ball on the table (constant, not proportional to the speed):
 * rolling resistance (coefficient, deceleration = value × g; the spin follows, rolling stays rolling)
 * and the decay of the spin about the vertical axis (side spin, rad/s per second).
 */
export const ROLLING_RESISTANCE = 0.01;
export const SIDE_SPIN_DECEL = 10;

/** Playing plate (felt on a carrier). Friction is averaged with the ball's: (0.34 + 0.06) / 2 = 0.2 sliding friction on the cloth. */
export const TABLE_RESTITUTION = 0.4;
export const TABLE_FRICTION = 0.34;

/** Pocket cup (catcher, leather) */
export const CUP_RESTITUTION = 0.2;
export const CUP_FRICTION = 0.5;

/** A ball counts as resting below these values (m/s center of mass, m/s surface speed from rotation). */
export const REST_LINEAR_SPEED = 0.01;
export const REST_SURFACE_SPEED = 0.02;

/** Cue tip (leather/rubber with chalk): its front is a dome of this radius of curvature (m). */
export const CUE_TIP_CURVATURE_RADIUS = 0.0095;
export const CUE_TIP_FRICTION = 0.8;
/** 0: the leather/rubber tip does not bounce; the ball leaves with the cue's speed (Rapier ignores small restitution anyway, so 0 keeps the power → speed mapping consistent). */
export const CUE_TIP_RESTITUTION = 0;

/**
 * Side spin ("english"). In the simulation the cue tip is infinitely heavy, so a hit off center sends
 * the ball far off the aim line (14 degrees at the edge of the ball instead of the 1-3 of a real cue).
 * After the hit its direction is pulled back to a deflection of at most this many degrees (at the
 * farthest point off center, away from the side that was hit); the spin stays as it is.
 */
export const CUE_SQUIRT_MAX_DEG = 2.5;

/**
 * Swerve: with a raised cue the spin axis is tilted and the ball, as long as it slides on the cloth,
 * curves. The friction of the cloth already gives this, but weakly. For this many seconds after the
 * hit the sideways part of the sliding friction on the white ball is multiplied by SWERVE_BOOST
 * (1 = as the physics gives it).
 */
export const SWERVE_BOOST = 8;
export const SWERVE_SECONDS = 1;

/**
 * Collision groups (Rapier: membership in the high 16 bits, filter in the low 16 bits).
 * The cue only collides with balls, never with the table, cushions or cups.
 */
export const GROUP_BALL = 0x0001ffff;
export const GROUP_STATIC = 0x0004ffff;
export const GROUP_CUE = 0x00020001;

/** The white ball (pocketed or shot off the table) is put back after this many seconds at the earliest, and only when all other balls lie still. */
export const CUE_RESPAWN_DELAY = 0.6;

/**
 * Speed of the white ball after the hit (m/s) for the chosen power p (0..1):
 * SHOT_SPEED_MIN + p^SHOT_SPEED_CURVE × (SHOT_SPEED_MAX − SHOT_SPEED_MIN). The curve keeps soft shots
 * finely adjustable; only the top of the range reaches break speed.
 */
export const SHOT_SPEED_MIN = 0.8;
export const SHOT_SPEED_MAX = 8;
export const SHOT_SPEED_CURVE = 2;
