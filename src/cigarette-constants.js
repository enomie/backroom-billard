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
export const CIGARETTE_COLOR_FILTER = 0xd9a85f; // beige-tan, like a real filter
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
/** The two pack designs: dark (black/red/gold) and light (white/blue). `card` = cardboard color, the rest is the front art. */
export const PACK_DESIGNS = [
  { card: 0x15110e, background: "#17120f", band: "#8c1a22", line: "#d4a84a", text: "#e0b85a", bandText: "#e0b85a", title: "BACKROOM", subtitle: "Premium Blend" },
  { card: 0xf1efe9, background: "#f3f1ea", band: "#1f4e9c", line: "#1f4e9c", text: "#1f3f78", bandText: "#f3f1ea", title: "BACKROOM", subtitle: "Light Blend" },
];

/** On the round tables: share of tables with a pack, share of the packs that are open. */
export const PACK_TABLE_SHARE = 0.5;
export const PACK_OPEN_SHARE = 0.5;
export const PACK_RING_MIN = 0.12;
export const PACK_RING_MAX = 0.28;
/** On the frame of the billard table: one pack per player at ±this z (between two diamonds), lying across the frame. */
export const PACK_FRAME_Z = 0.5;
export const PACK_SEED = 53;

/* ---- Exhaled cloud (exhale.js) ---- */
/** A full breath = this many puffs, released over this many seconds; at most EXHALE_POOL puffs at a time. */
export const EXHALE_PUFFS = 36; // a full breath
export const EXHALE_PUFFS_MIN = 5; // the shortest drag
export const EXHALE_POOL = 120;
export const EXHALE_SECONDS = 1.6; // duration of a full breath (shorter for a short drag)
export const EXHALE_SECONDS_MIN = 0.5;
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

/* ---- Smoking: the T key draws on the player's cigarette (smoking.js) ---- */
/** The cigarette flies from the ashtray to the mouth and back (s). */
export const SMOKING_FLY_IN = 0.45;
export const SMOKING_FLY_OUT = 0.5;
/** Height of the arc of its flight (m). */
export const SMOKING_ARC = 0.07;
/** Holding T longer draws harder: the drag is full after this many seconds; a short tap still gives a small puff. */
export const SMOKING_MAX_DRAW = 3;
export const SMOKING_MIN_STRENGTH = 0.12;
/** The cigarette at the mouth: in front of and below the camera (m), pointing forward and a little up (rad). */
export const SMOKING_MOUTH_FORWARD = 0.3;
export const SMOKING_MOUTH_DOWN = 0.1;
export const SMOKING_MOUTH_RIGHT = 0.05; // a little to the right, so it does not hide behind the cue
export const SMOKING_MOUTH_TILT = 0.18;
/** Drawing: the ember glows brighter (reaches its maximum after this many seconds) and the cigarette burns this much faster. */
export const SMOKING_GLOW_RISE = 1.5;
export const SMOKING_BURN_FACTOR = 28; // a full 3 s drag burns about a fifth of a cigarette (5 drags per cigarette)

/** A cigarette that is burnt down is dropped into the ashtray from this height above the rim (m); bounce and spin of the fall. */
export const SMOKING_DROP_HEIGHT = 0.1;
export const SMOKING_DROP_BOUNCE = 0.35;
export const SMOKING_DROP_SPIN = 9; // rad/s
export const SMOKING_DROP_SPREAD = 0.03; // it lands this far (m, times the ashtray scale) from the middle of the dish

/* ---- Taking a new cigarette from the pack and lighting it (smoking.js): all while T is held ---- */
export const SMOKING_FETCH_SECONDS = 0.5; // pack → mouth
export const LIGHTING_FLY = 0.3; // the lighter comes up to the cigarette
export const LIGHTING_OPEN = 0.15; // the lid flips open
export const LIGHTING_HOLD = 0.6; // flame on; the cigarette catches fire after 40 % of it
export const LIGHTING_CLOSE = 0.15; // flame off, lid closes
export const LIGHTING_BACK = 0.3; // the lighter returns to its place
