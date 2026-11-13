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

/** Vodka: an eighth of a litre (Austrian "Achterl") on the rocks, in a straight water glass. */
export const VODKA_GLASS_HEIGHT = 0.1;
export const VODKA_GLASS_RADIUS_BOTTOM = 0.031;
export const VODKA_GLASS_RADIUS_TOP = 0.035;
export const VODKA_GLASS_BASE = 0.012;
export const VODKA_LEVEL = 0.067;

/** Gin tonic: tall, straight highball glass, ice and a slice of lime. */
export const HIGHBALL_GLASS_HEIGHT = 0.15;
export const HIGHBALL_GLASS_RADIUS_BOTTOM = 0.032;
export const HIGHBALL_GLASS_RADIUS_TOP = 0.034;
export const HIGHBALL_GLASS_BASE = 0.014;
export const GIN_TONIC_LEVEL = 0.122;
export const LIME_RADIUS = 0.021;
export const LIME_THICKNESS = 0.006;

/**
 * Glasses on a stem (cognac snifter, champagne flute, cocktail glass): total height, stem height
 * (the bowl starts above it), foot radius, widest bowl radius, fill (share of the bowl height when
 * full) and how the level falls with the share (1 = linear; below 1 for bowls that are wider at
 * the top, so that each sip takes about the same amount).
 */
export const SNIFTER = { height: 0.125, stem: 0.032, foot: 0.034, bowl: 0.045, fill: 0.3, volume: 0.6 };
export const FLUTE = { height: 0.225, stem: 0.105, foot: 0.032, bowl: 0.024, fill: 0.78, volume: 0.8 };
export const COCKTAIL_GLASS = { height: 0.165, stem: 0.085, foot: 0.038, bowl: 0.056, fill: 0.72, volume: 0.34 };
/** The cherry on its pick in the cocktail. */
export const CHERRY_RADIUS = 0.009;
export const CHERRY_COLOR = 0x8a0614;
export const PICK_RADIUS = 0.0012;

/**
 * Ice cubes (m): they float (ICE_SINK of a cube is below the surface) and sink with the level;
 * in an empty glass they lie on the bottom. They melt in ICE_MELT_SECONDS from full size down
 * to ICE_MELT_MIN of it, then they are gone. Per drink: edge length and the cubes as
 * [x, z, layer] (layer 0 floats at the top, 1 below it, …).
 */
export const ICE_SINK = 0.9;
export const ICE_MELT_SECONDS = 300;
export const ICE_MELT_MIN = 0.35;
export const ICE_ROUNDING = 0.18; // share of the edge length that is rounded off
export const ICE = {
  whiskey: { size: 0.025, cubes: [[-0.012, 0.001, 0], [0.012, -0.002, 0]] },
  "white-russian": { size: 0.025, cubes: [[-0.012, 0.001, 0], [0.012, -0.002, 0]] },
  vodka: { size: 0.023, cubes: [[-0.011, -0.005, 0], [0.011, -0.004, 0], [0.001, 0.009, 1]] },
  "gin-tonic": { size: 0.023, cubes: [[-0.011, 0.004, 0], [-0.002, -0.006, 1], [-0.012, 0.005, 2], [-0.003, -0.005, 3]] },
};

/** Glass wall thickness and glass look (clear with a slight blue-green tint, mostly see-through). */
export const GLASS_WALL = 0.0012;
export const GLASS_COLOR = 0xe4f0f0;
export const GLASS_OPACITY = 0.22;

/** Table settings: how many glasses per table (one is chosen at random for each table), seed. */
export const GLASSES_PER_TABLE = [0, 1, 1, 2, 2];
export const GLASSES_RING_MIN = 0.12;
export const GLASSES_RING_MAX = 0.28;
export const GLASSES_SEED = 23;
/** How often each drink stands on the round tables (weights, they add up to 1). */
export const GLASSES_KIND_WEIGHTS = {
  beer: 0.18,
  "wine-red": 0.2,
  "wine-white": 0.09,
  whiskey: 0.14,
  "white-russian": 0.1,
  vodka: 0.06,
  cognac: 0.06,
  champagne: 0.06,
  "gin-tonic": 0.06,
  cocktail: 0.05,
};

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
 * the level falls steadily. The glass tilts from START (full) to END (empty, the bottom up) (rad) and takes
 * DRINK_TILT_SECONDS to reach the tilt. After at least DRINK_AHH_MIN_GULPS gulps the player sighs.
 */
export const DRINK_FLY_IN = 0.45;
export const DRINK_SIP_SECONDS = 0.8;
export const DRINK_SIP_JITTER = 0.15;
export const DRINK_FLY_OUT = 0.45;
export const DRINK_TILT_START = 0.7;
export const DRINK_TILT_END = 1.9;
export const DRINK_TILT_SECONDS = 0.35;
export const DRINK_AHH_MIN_GULPS = 2;
/**
 * Where the glass is held, in front of the face and in view (m): the camera sees 25° below the middle of the screen, so DOWN stays small
 * compared to FORWARD (0.2 / 0.3 put the glass below the picture).
 */
export const DRINK_MOUTH_FORWARD = 0.4;
export const DRINK_MOUTH_DOWN = 0.08;
export const DRINK_MOUTH_RIGHT = 0.06;
export const DRINK_ARC = 0.06;

/**
 * The look of the drinks: they are clear. Seen through the middle of the glass a drink is dark and
 * dense (much liquid behind), at the edges lighter, more saturated and more transparent, and a
 * warm glow shines through the thin edges. center / edge: the colors; opacityCenter / opacityEdge;
 * power: how quickly the dark middle gives way (higher = narrower); glow: the light shining through;
 * meniscus [height, width] (m): the surface climbs the glass wall a little (the wetting) and the
 * climbing edge is bright; sparkle: share of the cells holding a rising bubble, bubble: their color; roughness;
 * vertexColors: false for a shape without them (the ice cubes).
 */
export const LIQUID_LOOKS = {
  whiskey: { center: 0x6e2a08, edge: 0xc5701a, opacityCenter: 0.86, opacityEdge: 0.42, power: 2.4, glow: 0x7a3306, meniscus: [0.0013, 0.0032] },
  beer: { center: 0xb4680a, edge: 0xf4bc2c, opacityCenter: 0.8, opacityEdge: 0.46, power: 2.0, glow: 0x7a4a08, meniscus: [0.001, 0.0025], sparkle: 0.07 },
  redWine: { center: 0x2c0612, edge: 0x9e1730, opacityCenter: 0.94, opacityEdge: 0.58, power: 2.2, glow: 0x420714, meniscus: [0.0016, 0.0035] },
  whiteWine: { center: 0xa4a62e, edge: 0xe8ec80, opacityCenter: 0.64, opacityEdge: 0.3, power: 1.8, glow: 0x4a4c10, meniscus: [0.0016, 0.0035] },
  coffee: { center: 0x1c0b05, edge: 0x7c4220, opacityCenter: 0.96, opacityEdge: 0.78, power: 2.0, glow: 0x2c1307 },
  vodka: { center: 0xd2dee2, edge: 0xf2f8fa, opacityCenter: 0.3, opacityEdge: 0.16, power: 1.6, glow: 0x161c20, meniscus: [0.0013, 0.003] },
  cognac: { center: 0x4a1404, edge: 0xb4521a, opacityCenter: 0.9, opacityEdge: 0.5, power: 2.4, glow: 0x6a2406, meniscus: [0.0015, 0.0035] },
  champagne: { center: 0xc2ae52, edge: 0xf2e6a0, opacityCenter: 0.55, opacityEdge: 0.28, power: 1.8, glow: 0x4a4010, meniscus: [0.0012, 0.0025], sparkle: 0.1 },
  tonic: { center: 0xc6d6da, edge: 0xeef6f6, opacityCenter: 0.34, opacityEdge: 0.18, power: 1.6, glow: 0x1c2628, meniscus: [0.0012, 0.003], sparkle: 0.06, bubble: 0xb0bcc0 },
  cocktail: { center: 0x8a0c34, edge: 0xf0507a, opacityCenter: 0.86, opacityEdge: 0.5, power: 2.0, glow: 0x5a0820, meniscus: [0.0014, 0.003] },
  ice: { center: 0xc8dce4, edge: 0xf4fafc, opacityCenter: 0.16, opacityEdge: 0.55, power: 1.6, glow: 0x24323a, roughness: 0.06, vertexColors: false },
  cream: { center: 0xd8c8a6, edge: 0xf4ebd4, opacityCenter: 0.96, opacityEdge: 0.8, power: 1.6, glow: 0x3a3020, meniscus: [0.0012, 0.003], roughness: 0.35 },
};
