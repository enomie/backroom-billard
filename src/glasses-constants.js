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
export const WINE_COLOR_RED = 0x4d0a18;
export const WINE_COLOR_WHITE = 0xe8dc9c;

/** Beer glass: slightly conical, heavy base; beer topped by a foam head. */
export const BEER_GLASS_HEIGHT = 0.15;
export const BEER_GLASS_RADIUS_BOTTOM = 0.0275;
export const BEER_GLASS_RADIUS_TOP = 0.0345;
export const BEER_GLASS_BASE = 0.012; // thickness of the glass floor
export const BEER_LEVEL = 0.115; // top of the beer (above the table)
export const BEER_FOAM_HEIGHT = 0.037; // foam head, domed above the rim
export const BEER_COLOR = 0xe0a21b;
export const BEER_FOAM_COLOR = 0xf4efe0;

/** Whiskey tumbler: short, wide, heavy base; two fingers of whiskey. */
export const WHISKEY_GLASS_HEIGHT = 0.09;
export const WHISKEY_GLASS_RADIUS_BOTTOM = 0.033;
export const WHISKEY_GLASS_RADIUS_TOP = 0.0375;
export const WHISKEY_GLASS_BASE = 0.018;
export const WHISKEY_LEVEL = 0.058;
export const WHISKEY_COLOR = 0xb8681a;

/** Glass wall thickness and glass look (clear with a slight blue-green tint, mostly see-through). */
export const GLASS_WALL = 0.0012;
export const GLASS_COLOR = 0xe4f0f0;
export const GLASS_OPACITY = 0.22;

/** Table settings: how many glasses per table (one is chosen at random for each table), seed. */
export const GLASSES_PER_TABLE = [0, 1, 1, 2, 2];
export const GLASSES_RING_MIN = 0.12;
export const GLASSES_RING_MAX = 0.28;
export const GLASSES_SEED = 23;
/** Share of wine glasses and of whiskey tumblers (the rest is beer), and of red among the wine. */
export const GLASSES_WINE_SHARE = 0.35;
export const GLASSES_WHISKEY_SHARE = 0.25;
export const GLASSES_RED_SHARE = 0.7;

/** On the billard table frame: along z, between the last diamond and the ashtray (see ashtray-constants.js). */
export const GLASSES_FRAME_Z = 0.82;

/* ---- Drinking (the players' glasses on the billard table frame) ---- */
/** Sips per drink: the level drops by one share with each sip until the glass is empty. */
export const DRINK_SIPS = 5;
/** The beer foam falls apart in this many seconds: first thinner, then a hole opens in the middle, until only a ring at the wall is left. */
export const BEER_FOAM_DECAY_SECONDS = 240;
/** A sip: the glass flies to the mouth, tilts for a moment, and flies back (s); where it is held (m) and how far it tilts (rad). */
export const DRINK_FLY_IN = 0.45;
export const DRINK_SIP_SECONDS = 0.8;
export const DRINK_FLY_OUT = 0.45;
export const DRINK_TILT = 0.85;
export const DRINK_MOUTH_FORWARD = 0.3;
export const DRINK_MOUTH_DOWN = 0.2;
export const DRINK_MOUTH_RIGHT = 0.05;
export const DRINK_ARC = 0.06;
