/**
 * Physics parameters (Rapier). Values and rationale: _docs/physics.md
 */

/** Fixed simulation time step (240 Hz). */
export const PHYSICS_STEP = 1 / 240;

/** Cushion (K-66 rubber) */
export const CUSHION_RESTITUTION = 0.7;
export const CUSHION_FRICTION = 0.2;
export const CONTACT_SKIN_M = 0.001;

/** Ball (Aramith, phenolic resin) */
export const BALL_MASS_KG = 0.17;
export const BALL_RESTITUTION = 0.95;
export const BALL_FRICTION = 0.06;
export const LINEAR_DAMPING = 0.25;
export const ANGULAR_DAMPING = 0.4;

/** Playing plate (felt on a carrier) */
export const TABLE_RESTITUTION = 0.4;
export const TABLE_FRICTION = 0.15;

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
 * Collision groups (Rapier: membership in the high 16 bits, filter in the low 16 bits).
 * The cue only collides with balls, never with the table, cushions or cups.
 */
export const GROUP_BALL = 0x0001ffff;
export const GROUP_STATIC = 0x0004ffff;
export const GROUP_CUE = 0x00020001;
