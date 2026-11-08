/**
 * The foyer behind the door (meters): a square, brightly lit room that shines through the glass
 * into the backroom. It starts behind the wall at z = +ROOM_LENGTH / 2 + DOOR_WALL_DEPTH.
 * See _docs/look.md.
 */
export const FOYER_SIZE = 15;
export const FOYER_HEIGHT = 4.5;

/** Floor: black and white marble tiles; walls: dark green below the brass rail, cream above. */
export const FOYER_TILE = 0.75;
export const FOYER_COLOR_TILE_LIGHT = "#efeadf";
export const FOYER_COLOR_TILE_DARK = "#25282b";
export const FOYER_COLOR_WALL = "#ebe2c8";
export const FOYER_COLOR_WAINSCOT = "#1f3d33";
export const FOYER_COLOR_CEILING = 0xf4f0e6;
export const FOYER_COLOR_BRASS = 0xb8923d;
export const FOYER_RAIL_HEIGHT = 1.1;
export const FOYER_BASEBOARD_HEIGHT = 0.14;
/** The foyer is lit on its own: its surfaces glow a little so that the corners do not go black. */
export const FOYER_GLOW = 0.12;

/** The globe of opal glass in the middle of the ceiling and the point light inside it. */
export const FOYER_LAMP_CENTER_Y = 3.7;
export const FOYER_LAMP_RADIUS = 0.35;
export const FOYER_LIGHT_COLOR = 0xf4f7ff;
export const FOYER_LIGHT_INTENSITY = 35;
export const FOYER_LIGHT_DECAY = 1.2;
/** Beyond this distance the light is gone, so that it hardly reaches past the walls into the backroom. */
export const FOYER_LIGHT_DISTANCE = 14;
/** The shadows keep the light inside the foyer except through the door; they are drawn once (nothing moves). */
export const FOYER_SHADOW_MAP_SIZE = 1024;
export const FOYER_SHADOW_RADIUS = 2;

/**
 * The light that falls through the door into the backroom (amber, tinted by the glass): a spot
 * just behind the door, aimed at the floor in front of it. Its shadow shapes the beam: the leaves
 * stop it, the glass and the slits let it through. Drawn once, like the shadow above.
 */
export const FOYER_SPILL_COLOR = 0xffc477;
export const FOYER_SPILL_INTENSITY = 32;
export const FOYER_SPILL_ANGLE = 0.5;
export const FOYER_SPILL_PENUMBRA = 0.5;
export const FOYER_SPILL_DECAY = 1.2;
export const FOYER_SPILL_DISTANCE = 16;
export const FOYER_SPILL_HEIGHT = 2.4;
/** How far behind the door the spot hangs, and where on the backroom floor it points (z in the room). */
export const FOYER_SPILL_BEHIND = 1.6;
export const FOYER_SPILL_AIM_Z = 9;
