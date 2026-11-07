/** Sound parameters (gains are linear, 0..1; times in seconds). See _docs/sound.md. */

export const MASTER_GAIN = 0.6;

/**
 * Positional sound: every sound comes from where it happens (the listener is the camera). Within
 * SOUND_REF_DISTANCE the level is unchanged; beyond it the level falls off gently
 * (inverse model, SOUND_ROLLOFF = steepness).
 */
export const SOUND_REF_DISTANCE = 1.2;
export const SOUND_ROLLOFF = 0.7;

/** Hand sliding on the shaft while the cue is drawn back. */
/** Generated lengths; the closest one is played slightly faster/slower to fit the draw-back time. */
export const SLIDE_LENGTHS = [0.3, 0.45, 0.6];
export const SLIDE_VARIANTS = 2; // per length
export const SLIDE_GAIN_MIN = 0.05;
export const SLIDE_GAIN_MAX = 0.12;

/** Breath: inhale while drawing back, short exhale when the cue snaps forward (very subtle). */
export const BREATH_ENABLED = true;
export const BREATH_IN_SECONDS = 0.55;
export const BREATH_OUT_SECONDS = 0.4;
export const BREATH_VARIANTS = 2;
export const BREATH_IN_GAIN_MIN = 0.03;
export const BREATH_IN_GAIN_MAX = 0.07;
export const BREATH_OUT_GAIN_MIN = 0.03;
export const BREATH_OUT_GAIN_MAX = 0.08;

/** Air swish of the snapping cue; harder shots are louder and brighter (stages). */
export const WHOOSH_SECONDS = 0.2; // the swish peaks at WHOOSH_PEAK × this length, then stops abruptly
export const WHOOSH_PEAK = 0.9;
export const WHOOSH_STAGES = 3;
export const WHOOSH_VARIANTS = 2;
export const WHOOSH_GAIN_MIN = 0.08;
export const WHOOSH_GAIN_MAX = 0.4;

/** Strike: the leather tip hits the ball ("tock"). Harder shots are louder, brighter and sharper. */
export const STRIKE_SECONDS = 0.25;
export const STRIKE_STAGES = 4;
export const STRIKE_VARIANTS = 3;
export const STRIKE_GAIN_MIN = 0.25;
export const STRIKE_GAIN_MAX = 0.9;

/** Random pitch variation (± fraction) so repeated sounds do not sound identical. */
export const PITCH_VARIATION = 0.05;

/* ---- Collisions: ball–ball and ball–cushion --------------------------------------------- */
/** Impact speeds (m/s, along the collision normal): below MIN is silent, MAX is the loudest. */
export const COLLISION_MIN_SPEED = 0.06;
export const COLLISION_MAX_SPEED = 4.5;
/** Two balls count as touching when their surfaces are closer than this (m). */
export const BALL_TOUCH_DISTANCE = 0.0015;
/** Bright, hard "klack" of phenolic balls. */
export const BALL_HIT_SECONDS = 0.12;
export const BALL_HIT_STAGES = 5;
export const BALL_HIT_VARIANTS = 4;
export const BALL_HIT_GAIN_MIN = 0.06;
export const BALL_HIT_GAIN_MAX = 0.7;
/** Duller "thump" of a ball on the rubber cushion. */
export const CUSHION_HIT_SECONDS = 0.22;
export const CUSHION_HIT_STAGES = 4;
export const CUSHION_HIT_VARIANTS = 3;
export const CUSHION_HIT_GAIN_MIN = 0.05;
export const CUSHION_HIT_GAIN_MAX = 0.55;
/** Same pair/ball is silent for this long after a sound (s); at most this many sounds per window. */
export const COLLISION_COOLDOWN = 0.05;
export const COLLISION_MAX_VOICES = 8;
export const COLLISION_VOICE_WINDOW = 0.04;

/* ---- Rolling: one very quiet looping noise whose level and brightness follow the balls ------- */
export const ROLL_GAIN_MAX = 0.05;
/** Summed speed of all rolling balls (m/s) at which the rolling sound reaches its maximum. */
export const ROLL_FULL_ACTIVITY = 6;
export const ROLL_CUTOFF_MIN = 350; // Hz, slow
export const ROLL_CUTOFF_MAX = 1700; // Hz, fast
export const ROLL_LOOP_SECONDS = 2;
export const ROLL_SMOOTHING = 0.08; // gain smoothing time constant (s)

/* ---- Pocket and cup ------------------------------------------------------------------------ */
export const CUP_RIM_GAIN_MIN = 0.05;
export const CUP_RIM_GAIN_MAX = 0.3;
export const CUP_FALL_GAIN = 0.1;
export const CUP_LANDING_SECONDS = 0.55;
export const CUP_LANDING_STAGES = 3;
export const CUP_LANDING_VARIANTS = 2;
export const CUP_LANDING_GAIN_MIN = 0.15;
export const CUP_LANDING_GAIN_MAX = 0.8;
export const CUP_WALL_STAGES = 3;
export const CUP_WALL_VARIANTS = 2;
export const CUP_WALL_GAIN_MIN = 0.05;
export const CUP_WALL_GAIN_MAX = 0.45;
