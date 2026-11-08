/**
 * Wine and beer glasses (meters). They stand on some round tables and, one per player, on the
 * wooden frame of the billard table. See _docs/glass-objects.md.
 */

/** Wine glass: tulip bowl on a thin stem and a flat foot. */
export const WINE_GLASS_HEIGHT = 0.2;
export const WINE_GLASS_BOWL_RADIUS = 0.04; // widest part of the bowl
export const WINE_GLASS_STEM_RADIUS = 0.004;
export const WINE_GLASS_STEM_HEIGHT = 0.085; // the bowl starts above this
export const WINE_GLASS_FOOT_RADIUS = 0.033;
/** Fill level as a share of the bowl height. */
export const WINE_FILL = 0.4;

/** Beer glass: slightly conical, heavy base; beer topped by a foam head. */
export const BEER_GLASS_HEIGHT = 0.15;
export const BEER_GLASS_RADIUS_BOTTOM = 0.0275;
export const BEER_GLASS_RADIUS_TOP = 0.0345;
export const BEER_GLASS_BASE = 0.012; // thickness of the glass floor
export const BEER_LEVEL = 0.115; // top of the beer (above the table)
export const BEER_FOAM_HEIGHT = 0.037; // foam head, domed above the rim
export const BEER_FOAM_COLOR = 0xf4efe0;

/** Whiskey tumbler: short, wide, heavy base; two fingers of whiskey. */
export const WHISKEY_GLASS_HEIGHT = 0.09;
export const WHISKEY_GLASS_RADIUS_BOTTOM = 0.033;
export const WHISKEY_GLASS_RADIUS_TOP = 0.0375;
export const WHISKEY_GLASS_BASE = 0.018;
export const WHISKEY_LEVEL = 0.058;

/** White Russian: in the same tumbler, coffee liqueur below and cream on top (a layered drink). */
export const WHITE_RUSSIAN_LEVEL = 0.068;
export const WHITE_RUSSIAN_COFFEE_SHARE = 0.45; // share of the drink that is the dark layer

/** Glass wall thickness and glass look (clear with a slight blue-green tint, mostly see-through). */
export const GLASS_WALL = 0.0012;
export const GLASS_COLOR = 0xe4f0f0;
export const GLASS_OPACITY = 0.22;

/** Table settings: how many glasses per table (one is chosen at random for each table), seed. */
export const GLASSES_PER_TABLE = [0, 1, 1, 2, 2];
export const GLASSES_RING_MIN = 0.12;
export const GLASSES_RING_MAX = 0.28;
export const GLASSES_SEED = 23;
/** Share of wine glasses, whiskey tumblers and white russians (the rest is beer), and of red among the wine. */
export const GLASSES_WINE_SHARE = 0.3;
export const GLASSES_WHISKEY_SHARE = 0.2;
export const GLASSES_WHITE_RUSSIAN_SHARE = 0.15;
export const GLASSES_RED_SHARE = 0.7;

/** On the billard table frame: along z, between the last diamond and the ashtray (see ashtray-constants.js). */
export const GLASSES_FRAME_Z = 0.82;

/* ---- Drinking (the players' glasses on the billard table frame) ---- */
/** Sips per drink: the level drops by one share with each sip until the glass is empty. */
export const DRINK_SIPS = 5;
/** The beer foam falls apart in this many seconds: first thinner, then a hole opens in the middle, until only a ring at the wall is left. */
export const BEER_FOAM_DECAY_SECONDS = 240;
/**
 * R held: the glass flies to the mouth (s) and stays there, one gulp after the other, until R is
 * let go or the glass is empty; then it flies back (s). One gulp takes DRINK_SIP_SECONDS (±jitter),
 * the level falls steadily. The glass tilts from START (full) to END (empty) (rad) and takes
 * DRINK_TILT_SECONDS to reach the tilt. After at least DRINK_AHH_MIN_GULPS gulps the player sighs.
 */
export const DRINK_FLY_IN = 0.45;
export const DRINK_SIP_SECONDS = 0.8;
export const DRINK_SIP_JITTER = 0.15;
export const DRINK_FLY_OUT = 0.45;
export const DRINK_TILT_START = 0.7;
export const DRINK_TILT_END = 1.2;
export const DRINK_TILT_SECONDS = 0.35;
export const DRINK_AHH_MIN_GULPS = 2;
/** Where the glass is held (m). */
export const DRINK_MOUTH_FORWARD = 0.3;
export const DRINK_MOUTH_DOWN = 0.2;
export const DRINK_MOUTH_RIGHT = 0.05;
export const DRINK_ARC = 0.06;

/**
 * The look of the drinks: they are clear. Seen through the middle of the glass a drink is dark and
 * dense (much liquid behind), at the edges lighter, more saturated and more transparent, and a
 * warm glow shines through the thin edges. center / edge: the colors; opacityCenter / opacityEdge;
 * power: how quickly the dark middle gives way (higher = narrower); glow: the light shining through;
 * meniscus [height, width] (m): the surface climbs the glass wall a little (the wetting) and the
 * climbing edge is bright; sparkle: share of the cells holding a rising bubble; roughness.
 */
export const LIQUID_LOOKS = {
  whiskey: { center: 0x6e2a08, edge: 0xc5701a, opacityCenter: 0.86, opacityEdge: 0.42, power: 2.4, glow: 0x7a3306, meniscus: [0.0013, 0.0032] },
  beer: { center: 0xb4680a, edge: 0xf4bc2c, opacityCenter: 0.8, opacityEdge: 0.46, power: 2.0, glow: 0x7a4a08, meniscus: [0.001, 0.0025], sparkle: 0.07 },
  redWine: { center: 0x2c0612, edge: 0x9e1730, opacityCenter: 0.94, opacityEdge: 0.58, power: 2.2, glow: 0x420714, meniscus: [0.0016, 0.0035] },
  whiteWine: { center: 0xa4a62e, edge: 0xe8ec80, opacityCenter: 0.64, opacityEdge: 0.3, power: 1.8, glow: 0x4a4c10, meniscus: [0.0016, 0.0035] },
  coffee: { center: 0x1c0b05, edge: 0x7c4220, opacityCenter: 0.96, opacityEdge: 0.78, power: 2.0, glow: 0x2c1307 },
  cream: { center: 0xd8c8a6, edge: 0xf4ebd4, opacityCenter: 0.96, opacityEdge: 0.8, power: 1.6, glow: 0x3a3020, meniscus: [0.0012, 0.003], roughness: 0.35 },
};
