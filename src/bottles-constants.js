/**
 * Wine and beer bottles on the round tables (meters). See _docs/glass-objects.md.
 */

/** Wine bottle (Bordeaux shape): dark green glass, paper label, foil capsule on the neck. */
export const WINE_BOTTLE_HEIGHT = 0.3;
export const WINE_BOTTLE_RADIUS = 0.0375;
export const WINE_BOTTLE_SHOULDER_START = 0.17;
export const WINE_BOTTLE_SHOULDER_END = 0.225;
export const WINE_BOTTLE_NECK_RADIUS = 0.0125;
export const WINE_BOTTLE_COLOR = 0x0e3a1c;
export const WINE_BOTTLE_OPACITY = 0.9;
export const WINE_CAPSULE_COLOR = 0x5a0c18;
export const WINE_LABEL_BOTTOM = 0.04;
export const WINE_LABEL_HEIGHT = 0.095;

/** Beer bottle (0.33 l): brown glass, label, crown cap. */
export const BEER_BOTTLE_HEIGHT = 0.23;
export const BEER_BOTTLE_RADIUS = 0.03;
export const BEER_BOTTLE_SHOULDER_START = 0.125;
export const BEER_BOTTLE_SHOULDER_END = 0.175;
export const BEER_BOTTLE_NECK_RADIUS = 0.0125;
export const BEER_BOTTLE_COLOR = 0x4a2208;
export const BEER_BOTTLE_OPACITY = 0.88;
export const BEER_CAP_COLOR = 0xb08a30;
export const BEER_LABEL_BOTTOM = 0.04;
export const BEER_LABEL_HEIGHT = 0.07;

/** Per table: chance of a bottle, and of wine among the bottles (the rest is beer). */
export const BOTTLE_TABLE_SHARE = 0.4;
export const BOTTLE_WINE_SHARE = 0.5;
export const BOTTLE_RING_MIN = 0.12;
export const BOTTLE_RING_MAX = 0.28;
export const BOTTLE_SEED = 31;
