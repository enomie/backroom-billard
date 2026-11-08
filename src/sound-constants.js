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
export const BALL_HIT_SECONDS = 0.08;
export const BALL_HIT_STAGES = 5;
export const BALL_HIT_VARIANTS = 4;
export const BALL_HIT_GAIN_MIN = 0.06;
export const BALL_HIT_GAIN_MAX = 0.7;
/**
 * Vibration modes of a solid phenolic ball: pitch (Hz), amplitude, decay time (s) at a soft hit, and
 * how strongly the mode depends on the hit force (0 = always there, 1 = only on hard hits).
 */
export const BALL_HIT_MODES = [
  { hz: 3250, gain: 0.5, decay: 0.028, hard: 0.4 }, // fundamental
  { hz: 5600, gain: 0.25, decay: 0.016, hard: 0.8 }, // second overtone
  { hz: 8150, gain: 0.12, decay: 0.009, hard: 1.0 }, // crystalline edge
  { hz: 520, gain: 0.35, decay: 0.008, hard: 0.0 }, // mass / low-mid body
];
/** A mode fades to this fraction of its start amplitude within its decay time; its pitch drops by the factor below. */
export const BALL_HIT_MODE_FLOOR = 0.0001;
export const BALL_HIT_MODE_PITCH_DROP = 0.96;
/** Hard hits ring longer: decay time is scaled from MIN (soft) to MAX (hard). */
export const BALL_HIT_DECAY_SCALE_MIN = 0.75;
export const BALL_HIT_DECAY_SCALE_MAX = 1.25;
/** Noise click of the contact: band center (Hz) for soft/hard hits, decay (s), gain for soft/hard hits. */
export const BALL_HIT_CLICK_HZ_MIN = 2500;
export const BALL_HIT_CLICK_HZ_MAX = 5000;
export const BALL_HIT_CLICK_DECAY = 0.001;
export const BALL_HIT_CLICK_GAIN_MIN = 0.25;
export const BALL_HIT_CLICK_GAIN_MAX = 0.8;
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

/* ---- Smoking (smoke-sounds.js): the drag (a long, rising intake with crackling) and the exhale ---- */
export const DRAG_GAIN_START = 0.03;
export const DRAG_GAIN_END = 0.11;
export const DRAG_RISE_SECONDS = 3; // the intake gets louder and brighter for this long
export const DRAG_FROM_HZ = 700;
export const DRAG_TO_HZ = 1900;
export const DRAG_CRACKLE_GAIN = 0.05;
export const SMOKE_EXHALE_SECONDS_MIN = 0.7;
export const SMOKE_EXHALE_SECONDS_MAX = 2.6;
export const SMOKE_EXHALE_GAIN_MIN = 0.05;
export const SMOKE_EXHALE_GAIN_MAX = 0.13;

/* ---- Drinking (drink-sounds.js): the gulp, the liquid while the glass is tilted, the sigh ---- */
export const GULP_GAIN = 0.14;
export const GULP_SECONDS = 0.22;
export const GULP_VARIANTS = 4;
/** Liquid sound while tilted: band center (Hz), Q and gain per drink; beer fizzes, whiskey is nearly silent. */
export const DRINK_FLOW = {
  beer: { hz: 1500, q: 0.8, gain: 0.05 },
  "wine-red": { hz: 900, q: 1.0, gain: 0.035 },
  "wine-white": { hz: 1000, q: 1.0, gain: 0.035 },
  whiskey: { hz: 600, q: 1.2, gain: 0.02 },
  "white-russian": { hz: 700, q: 1.2, gain: 0.03 },
};
export const AHH_GAIN = 0.1;
export const AHH_SECONDS = 0.8;
