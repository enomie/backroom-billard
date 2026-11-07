/** Sound parameters (gains are linear, 0..1; times in seconds). See _docs/sound.md. */

export const MASTER_GAIN = 0.6;

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
