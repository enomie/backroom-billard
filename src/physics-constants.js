/**
 * Physik-Parameter (Rapier). Werte und Begründung: _docs/physics.md
 */

/** Fester Zeitschritt der Simulation (240 Hz). */
export const PHYSICS_STEP = 1 / 240;

/** Bande (K-66-Gummi) */
export const CUSHION_RESTITUTION = 0.7;
export const CUSHION_FRICTION = 0.2;
export const CONTACT_SKIN_M = 0.001;

/** Kugel (Aramith, Phenolharz) */
export const BALL_MASS_KG = 0.17;
export const BALL_RESTITUTION = 0.95;
export const BALL_FRICTION = 0.06;
export const LINEAR_DAMPING = 0.25;
export const ANGULAR_DAMPING = 0.4;

/** Spielplatte (Filz auf Träger) */
export const TABLE_RESTITUTION = 0.4;
export const TABLE_FRICTION = 0.15;

/** Taschenbecher (Auffänger, Leder) */
export const CUP_RESTITUTION = 0.2;
export const CUP_FRICTION = 0.5;

/** Kugel gilt als ruhend unterhalb dieser Werte (m/s Schwerpunkt, m/s Oberfläche durch Rotation). */
export const REST_LINEAR_SPEED = 0.01;
export const REST_SURFACE_SPEED = 0.02;
