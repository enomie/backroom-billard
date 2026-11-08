/**
 * Room and lighting parameters (meters). See _docs/look.md.
 * Heights are measured above the floor (y = 0).
 */

/** Free camera (key C): movement speed in m/s and mouse-look sensitivity in rad per pixel. */
export const FREE_CAM_SPEED = 2;
export const FREE_CAM_LOOK_SENSITIVITY = 0.0025;
/** Free camera on a touch screen: one finger; swiping sideways turns (rad per pixel), swiping up/down moves closer/further (m per pixel). */
export const FREE_CAM_TOUCH_TURN = 0.006;
export const FREE_CAM_TOUCH_MOVE = 0.012;
/**
 * Default pose of the free (observer) camera when it is first activated with C:
 * a side view on the table and the lamps — deliberately NOT the active player's view.
 */
export const FREE_CAM_START_POSITION = [2.1, 2.1, 3.0];
export const FREE_CAM_START_TARGET = [0, 1.7, 0];
/**
 * Cue camera: orbits the cue ball at this distance (m). The player tilts it between the minimum and
 * maximum elevation above the table (rad, 10° … 80°: almost level … almost straight down).
 * The camera looks at a point FP_CAM_LOOK_AHEAD · cos(elevation) in front of the ball.
 */
export const FP_CAM_DISTANCE = 1.02;
export const FP_CAM_MIN_ELEVATION = (10 * Math.PI) / 180;
export const FP_CAM_MAX_ELEVATION = (80 * Math.PI) / 180;
export const FP_CAM_DEFAULT_ELEVATION = 0.28;
export const FP_CAM_LOOK_AHEAD = 1.88;
/** Turning with the keys (A/D, arrows): rad per second. Mouse and touch rotate directly. */
export const FP_CAM_KEY_TURN_SPEED = 1.4;
/** The orbit center eases back to the new shot position at this rate (1/s) once the table is still. */
export const FP_CAM_FOCUS_RATE = 8;
/** The cue camera returns to the shot position once the table has been still for this long (s). */
export const SHOT_REST_DELAY = 0.4;

/** The free camera stays between these heights (m). */
export const FREE_CAM_MIN_Y = 1.5;
export const FREE_CAM_MAX_Y = 2.3;

/** Number of identical ceiling lamps above the table (arranged along the table length). */
export const LAMP_COUNT = 3;

/** Height of the lamp shade's lower rim above the floor. Changing it moves all lamps together. */
export const LAMP_HEIGHT = 2.0;

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

/**
 * Reflections in the balls (ball-reflection.js): the room is captured once as a cube map. The lit
 * opening of each ceiling lamp is drawn as a bright disc that only the capture sees (glow = HDR
 * brightness factor), so the lamps show as clear highlights without making the room brighter.
 */
export const BALL_REFLECTION_SIZE = 256;
export const BALL_REFLECTION_INTENSITY = 1;
export const LAMP_REFLECTION_GLOW = 14;

/** Spot light of each lamp. */
export const LAMP_LIGHT_COLOR = 0xffd9a0;
export const LAMP_LIGHT_INTENSITY = 3.3; // lower than before: the lamps hang closer to the table
export const LAMP_LIGHT_ANGLE = 0.72; // half opening angle in radians (~41°)
export const LAMP_LIGHT_PENUMBRA = 0.5;
export const LAMP_LIGHT_DECAY = 1.4;
export const LAMP_LIGHT_DISTANCE = 6;
export const LAMP_SHADOW_MAP_SIZE = 1024;
export const LAMP_SHADOW_RADIUS = 4; // soft shadow edge
/**
 * The three shadow maps are redrawn only when something in the cones has moved (billard.js,
 * updateShadows). The slow sway of the cue (no shot under way) is followed at most this often (s; 0 = every frame);
 * a burning cigarette counts as moved with each step of this share of its length.
 */
export const LAMP_SHADOW_SWAY_INTERVAL = 0; // every frame: a coarser step makes the cue shadow flicker
export const LAMP_SHADOW_BURN_STEP = 0.02;

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

/* ---- Wall paneling: glossy wood up to WAINSCOT_HEIGHT, a profiled cap rail on top, a baseboard
 * at the bottom; the plain wall starts above. */
export const WAINSCOT_HEIGHT = 1.8;
/** Thickness of the panel boards (the wall surface moves inwards by this much). */
export const WAINSCOT_THICKNESS = 0.03;
/** Widest part of the paneling (baseboard and cap rail) measured from the wall: furniture keeps this distance. */
export const WAINSCOT_PROTRUSION = 0.08;
/** Width of one framed panel along the wall. */
export const WAINSCOT_PANEL_WIDTH = 0.8;
export const WAINSCOT_COLOR = 0xffffff;
export const WAINSCOT_WOOD_BASE = "#5b2c16";

/** Linear fog in gray-white smoke: starts at FOG_NEAR, completely opaque at FOG_FAR. */
export const FOG_COLOR = 0x2f2e2c;
/** The fog never gets more opaque than this (1 = fully covers far objects at FOG_FAR). */
export const FOG_MAX_OPACITY = 0.6;
export const FOG_NEAR = 1;
export const FOG_FAR = 12;

/** One color for all smoke and haze (cigarette smoke, exhaled cloud, ground and ceiling fog): warm, nicotine-tinged gray, not pure white-gray. */
export const AIR_SMOKE_COLOR = 0x867a6e;

/**
 * Smoke, cloud and fog are lit by the lamps: they look light where a ceiling lamp or a candle
 * shines on them and dark elsewhere (smoke-light.js). Ambient = how much of the smoke color
 * stays in the dark; the strengths scale the light of the lamps and the candles.
 */
export const SMOKE_LIGHT_AMBIENT = 0.3;
export const SMOKE_LAMP_STRENGTH = 2.2;
export const SMOKE_CANDLE_STRENGTH = 1.2;
/** Candle light falls off with 1 / (1 + (distance / this)²) (m). */
export const SMOKE_CANDLE_RADIUS = 0.24;

/* ---- Atmosphere (atmosphere.js): drifting ground and ceiling fog, visible light shafts ----------
 * Fog = a few stacked, see-through layers with a slowly moving noise shader. */
export const GROUND_FOG_LAYERS = 5;
export const GROUND_FOG_TOP = 0.55; // the layers stand between 0.05 m and this height
export const GROUND_FOG_OPACITY = 0.12;
export const GROUND_FOG_COLOR = AIR_SMOKE_COLOR;
export const CEILING_FOG_LAYERS = 3;
export const CEILING_FOG_BOTTOM = 3.6; // the layers stand between this height and just below the ceiling
export const CEILING_FOG_OPACITY = 0.09;
export const CEILING_FOG_COLOR = AIR_SMOKE_COLOR;
/** Size of the fog wisps (noise cells per meter) and how fast they drift (m/s). */
export const FOG_WISP_SCALE = 0.28;
export const FOG_DRIFT_SPEED = 0.05;
/** Light shafts of the ceiling lamps: opening half angle (rad) and strength (0 = invisible). */
export const SHAFT_ANGLE = 0.6;
export const SHAFT_INTENSITY = 0.045;

/** Weak warm ambient light so the cream walls stay readable in the dim room. */
export const ROOM_AMBIENT_COLOR = 0x3d342a;
export const ROOM_AMBIENT_INTENSITY = 0.9;

/** The free camera keeps this distance (m) from the walls and the ceiling. */
export const FREE_CAM_ROOM_MARGIN = 1;

/* ---- Wall lamps: subtle cone lights on a bracket, pointing down ------------------------------
 * Same shade as the ceiling lamps (blue outside, golden inside), just smaller. */
/** Lamps per short wall (z = ±ROOM_LENGTH/2) and per long wall (x = ±ROOM_WIDTH/2). */
export const WALL_LAMPS_PER_SHORT_WALL = 2;
export const WALL_LAMPS_PER_LONG_WALL = 3;

/** How far the arm reaches out of the wall (m) — the shade hangs at its end. */
export const WALL_LAMP_ARM_LENGTH = 0.25;
/** Height of the shade's lower rim above the floor. */
export const WALL_LAMP_HEIGHT = 2.0;
/** Shade = ceiling lamp shade scaled down by this factor. */
export const WALL_LAMP_SCALE = 0.45;
/** Length of the stem between the arm and the shade apex. */
export const WALL_LAMP_STEM = 0.08;
/** Bracket (wall plate, arm, stem): brass. */
export const WALL_LAMP_COLOR_BRASS = 0x9a7b3c;

/** Subtle spot light of each wall lamp (no shadows, they only wash the wall and the floor). */
export const WALL_LAMP_LIGHT_COLOR = 0xffd9a0;
export const WALL_LAMP_LIGHT_INTENSITY = 1.2;
export const WALL_LAMP_LIGHT_ANGLE = 0.6;
export const WALL_LAMP_LIGHT_PENUMBRA = 0.7;
export const WALL_LAMP_LIGHT_DECAY = 1.6;
export const WALL_LAMP_LIGHT_DISTANCE = 7;
