/**
 * Room and lighting parameters (meters). See _docs/look.md.
 * Heights are measured above the floor (y = 0).
 */

/** Free camera (key C): movement speed in m/s and mouse-look sensitivity in rad per pixel. */
export const FREE_CAM_SPEED = 2;
export const FREE_CAM_LOOK_SENSITIVITY = 0.0025;
/**
 * Default pose of the free (observer) camera when it is first activated with C:
 * a side view on the table and the lamps — deliberately NOT the active player's view.
 */
export const FREE_CAM_START_POSITION = [2.1, 2.1, 3.0];
export const FREE_CAM_START_TARGET = [0, 1.7, 0];
/** Cue camera behind the cue ball: distance behind the ball and base height above it (m). */
export const FP_CAM_DISTANCE = 1.02;
export const FP_CAM_HEIGHT = 0.25;
/** The cue camera returns to the shot position once the table has been still for this long (s). */
export const SHOT_REST_DELAY = 0.4;

/** The free camera cannot go below this height (keeps it above the floor). */
export const FREE_CAM_MIN_Y = 0.15;

/** Number of identical ceiling lamps above the table (arranged along the table length). */
export const LAMP_COUNT = 3;

/** Height of the lamp shade's lower rim above the floor. Changing it moves all lamps together. */
export const LAMP_HEIGHT = 2.4;

/** Distance between neighbouring lamps along the table length. */
export const LAMP_SPACING = 0.85;

/** Cable length above the shade; long enough to always stick out through the ceiling. */
export const LAMP_CABLE_LENGTH = 10;

/** Cone shade (apex up, open at the bottom). */
export const LAMP_SHADE_RADIUS = 0.24;
export const LAMP_SHADE_HEIGHT = 0.2;

/** Colors: blue outside, golden inside, black cable. */
export const LAMP_COLOR_OUTSIDE = 0x1d4ed8;
export const LAMP_COLOR_INSIDE = 0xd4a017;
export const LAMP_COLOR_CABLE = 0x050505;

/** Spot light of each lamp. */
export const LAMP_LIGHT_COLOR = 0xffd9a0;
export const LAMP_LIGHT_INTENSITY = 3.6;
export const LAMP_LIGHT_ANGLE = 0.45; // half opening angle in radians (~26°)
export const LAMP_LIGHT_PENUMBRA = 0.5;
export const LAMP_LIGHT_DECAY = 1.4;
export const LAMP_LIGHT_DISTANCE = 6;
export const LAMP_SHADOW_MAP_SIZE = 1024;
export const LAMP_SHADOW_RADIUS = 4; // soft shadow edge

/* ---- Room (see _docs/look.md) ---------------------------------------------------------
 * Origin = table center, floor at y = 0. Length runs along the table length (z),
 * width along x. */
export const ROOM_LENGTH = 30;
export const ROOM_WIDTH = 15;
export const ROOM_HEIGHT = 4.5;

/** Carpet floor (dark wine red), wooden ceiling, walls in cream yellow ("smoke-stained white"). */
export const ROOM_COLOR_CARPET = 0x5a2226;
export const ROOM_COLOR_WALL = 0xdccb94;
/** Walls get darker/browner towards the ceiling (smoke collects there); 0 = none, 1 = strong. */
export const ROOM_WALL_SMOKE_GRADIENT = 0.35;
export const ROOM_COLOR_CEILING_WOOD = 0x6b4426;

/** Linear fog in gray-white smoke: starts at FOG_NEAR, completely opaque at FOG_FAR. */
export const FOG_COLOR = 0x2f2e2c;
/** The fog never gets more opaque than this (1 = fully covers far objects at FOG_FAR). */
export const FOG_MAX_OPACITY = 0.6;
export const FOG_NEAR = 1;
export const FOG_FAR = 12;

/** Weak warm ambient light so the cream walls stay readable in the dim room. */
export const ROOM_AMBIENT_COLOR = 0x3d342a;
export const ROOM_AMBIENT_INTENSITY = 0.9;

/** The free camera stays inside the room, this far away from the walls/ceiling. */
export const FREE_CAM_ROOM_MARGIN = 0.2;
