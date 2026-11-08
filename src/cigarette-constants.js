import { AIR_SMOKE_COLOR } from "./room-constants.js";

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
export const SMOKE_COLOR = AIR_SMOKE_COLOR;

/* ---- Pack: flip-top box with 20 cigarettes (7 – 6 – 7, filters up) ---- */
export const PACK_WIDTH = 0.058;
export const PACK_DEPTH = 0.0235;
export const PACK_HEIGHT = 0.088;
/** Height of the hinged lid (its front reaches this far down). */
export const PACK_LID_HEIGHT = 0.028;
export const PACK_CARDBOARD = 0.0006;
/** How far the open lid is swung back (rad). */
export const PACK_LID_OPEN_ANGLE = 1.95;
export const PACK_COLOR = 0x15110e;

/** On the round tables: share of tables with a pack, share of the packs that are open. */
export const PACK_TABLE_SHARE = 0.5;
export const PACK_OPEN_SHARE = 0.5;
export const PACK_RING_MIN = 0.12;
export const PACK_RING_MAX = 0.28;
/** On the frame of the billard table: one pack per player at ±this z (between two diamonds), lying across the frame. */
export const PACK_FRAME_Z = 0.5;
export const PACK_SEED = 53;

/* ---- Exhaled cloud (exhale.js) ---- */
/** A breath = this many puffs, released over this many seconds; at most EXHALE_POOL puffs at a time. */
export const EXHALE_PUFFS = 16;
export const EXHALE_POOL = 64;
export const EXHALE_SECONDS = 1.2;
/** Start speed (m/s) and its spread, how fast the puffs slow down (1/s) and how fast they rise (m/s²). */
export const EXHALE_SPEED = 1.5;
export const EXHALE_SPREAD = 0.14;
export const EXHALE_DRAG = 1.2;
export const EXHALE_RISE = 0.06;
/** Puff size (m) when it leaves the mouth and when it has dissolved. */
export const EXHALE_SIZE_START = 0.12;
export const EXHALE_SIZE_END = 0.75;
export const EXHALE_LIFE_MIN = 5;
export const EXHALE_LIFE_MAX = 8;
export const EXHALE_OPACITY = 0.4;
export const EXHALE_COLOR = AIR_SMOKE_COLOR;
/** The mouth: this far in front of and below the camera (m). */
export const EXHALE_MOUTH_FORWARD = 0.35;
export const EXHALE_MOUTH_DOWN = 0.12;
