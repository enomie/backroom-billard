/**
 * The player's condition: two markers, each between −1 and +1, calm in the middle (0).
 *   body:     −1 thirsty … 0 calm … +1 drunk
 *   nicotine: −1 nerves (too much nicotine) … 0 calm … +1 desire (craving)
 * See _docs/game-concept.md.
 */
export const PLAYER_START_BODY = 0;
export const PLAYER_START_NICOTINE = 0;
/** How fast the markers wander by themselves (per second): thirst grows, desire grows. */
export const THIRST_DRIFT = 0.003;
export const DESIRE_DRIFT = 0.004;
/** One sip pushes the body marker by this much (5 sips = 1.1); a drag pushes the nicotine marker by this much per second of drawing. */
export const SIP_EFFECT = 0.22;
export const DRAG_EFFECT = 0.1;
/** Within this distance from the middle a marker has no effect: the calm zone. */
export const CALM_ZONE = 0.12;
/** Unsteadiness of the aim: the largest swing of the cue and aim line (rad) and the extra aim error of a drunk shot. */
export const SWAY_MAX = 0.05;
/**
 * How fast each kind of unsteadiness swings: a factor on its frequencies (1 = the first version,
 * which was far too restless). Nerves, the tremor, was 7 and 12 swings per second, now about 2 and 3.5.
 */
export const SWAY_SPEED = { nerves: 0.3, desire: 0.65, thirsty: 0.55, drunk: 0.65 };
/** Time shift (s) of the vertical swing against the sideways one, so the cue tip circles around the target. */
export const SWAY_PITCH_OFFSET = 1.7;
export const DRUNK_SHOT_ERROR = 0.04;
