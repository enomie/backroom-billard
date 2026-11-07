/**
 * Single cigarettes (meters, seconds). See _docs/cigarettes.md.
 */

/** Size: total length with filter, diameter, filter length. */
export const CIGARETTE_LENGTH = 0.084;
export const CIGARETTE_DIAMETER = 0.008;
export const CIGARETTE_FILTER_LENGTH = 0.025;

/** A glowing cigarette burns down in this time (s of game time); then only the butt is left. */
export const CIGARETTE_BURN_SECONDS = 420;
/** Longest piece of ash at the tip. */
export const CIGARETTE_ASH_MAX = 0.006;
/** Length of paper that is left when the cigarette is burnt down (the butt). */
export const CIGARETTE_BUTT_PAPER = 0.002;

export const CIGARETTE_COLOR_PAPER = 0xf2eee4;
export const CIGARETTE_COLOR_FILTER = 0xd68a3a;
export const CIGARETTE_COLOR_ASH = 0x8d8982;
export const CIGARETTE_COLOR_EMBER = 0xff5a14;
export const CIGARETTE_EMBER_GLOW = 5; // HDR brightness of the ember
export const CIGARETTE_GLOW_SIZE = 0.05; // soft glow around the ember (m)

/** In an ashtray: where the cigarette rests on the rim (distance from the filter end) and its mix of states. */
export const CIGARETTE_REST_DISTANCE = 0.04;
export const CIGARETTE_TABLE_MIN = 1;
export const CIGARETTE_TABLE_MAX = 3;
/** States on the tables: share glowing, share unlit (the rest are butts). */
export const CIGARETTE_SHARE_GLOWING = 0.45;
export const CIGARETTE_SHARE_UNLIT = 0.2;
/** A glowing cigarette starts somewhere between fresh and this far burnt (0…1). */
export const CIGARETTE_START_BURN_MAX = 0.6;
export const CIGARETTE_SEED = 41;

/** Smoke thread rising from a glowing cigarette (see smoke.js). */
export const SMOKE_WIDTH = 0.05;
export const SMOKE_HEIGHT = 0.4;
export const SMOKE_OPACITY = 0.45;
export const SMOKE_COLOR = 0x8c8c94;
