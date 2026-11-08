/**
 * Look of the balls (see ball-texture.js): small specks on the surface, like the inclusions of ivory
 * balls, so that one sees how a ball turns. Only optical.
 */
/** Size of the texture of one ball (px, twice as wide as high: it wraps around the sphere). */
export const BALL_TEXTURE_WIDTH = 512;
export const BALL_TEXTURE_HEIGHT = 256;
/** Specks per ball and their radius at the equator (px; 1 px is about 0.35 mm on the ball). */
export const BALL_SPECK_COUNT = 90;
export const BALL_SPECK_RADIUS_MIN = 1.2;
export const BALL_SPECK_RADIUS_MAX = 3.4;
/** How far a speck colors away from the ball color (0 = not at all, 1 = fully its own color). */
export const BALL_SPECK_STRENGTH_MIN = 0.4;
export const BALL_SPECK_STRENGTH_MAX = 0.8;
/** Speck colors: dark brown on light and colored balls, light grey-cream on dark ones. */
export const BALL_SPECK_COLOR_ON_LIGHT = [58, 44, 30];
export const BALL_SPECK_COLOR_ON_DARK = [150, 140, 125];
/** A ball darker than this (0..1) gets the light specks. */
export const BALL_DARK_LIMIT = 0.3;
