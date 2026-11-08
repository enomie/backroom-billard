/**
 * Where the wall lamps stand and where their light is (shared by wall-lamps.js, which builds the
 * lamps, and wall-lamp-light.js, which adds their light to the materials).
 */
import {
  ROOM_LENGTH,
  ROOM_WIDTH,
  WAINSCOT_PROTRUSION,
  LAMP_SHADE_HEIGHT,
  WALL_LAMPS_PER_SHORT_WALL,
  WALL_LAMPS_PER_LONG_WALL,
  WALL_LAMP_ARM_LENGTH,
  WALL_LAMP_HEIGHT,
  WALL_LAMP_SCALE,
} from "./room-constants.js";
import {
  BAR_WALL_SIDE,
  BAR_WALL_Z,
  BAR_WALL_DISTANCE,
  BAR_DEPTH,
  BAR_LAMPS_COUNT,
  BAR_LAMPS_SPACING,
  BAR_LAMPS_FRONT,
  BAR_LAMPS_HEIGHT,
  BACKBAR_WIDTH,
  BACKBAR_LAMP_CLEARANCE,
} from "./bar-constants.js";

/** Evenly spread `count` positions along a wall of the given length, centered on 0. */
function spread(count, length) {
  return Array.from({ length: count }, (_, i) => ((i + 0.5) / count - 0.5) * length);
}

/**
 * Where the lamps stand: x, z on the wall and the rotation about y that makes local +z point into the
 * room. Short walls (z = ±length/2): lamps spread along x; long walls (x = ±width/2): along z.
 */
export function lampPlacements() {
  const placements = [];
  for (const x of spread(WALL_LAMPS_PER_SHORT_WALL, ROOM_WIDTH)) {
    placements.push([x, -ROOM_LENGTH / 2, 0], [x, ROOM_LENGTH / 2, Math.PI]);
  }
  for (const z of spread(WALL_LAMPS_PER_LONG_WALL, ROOM_LENGTH)) {
    // the back bar covers the wall in front of which the bar stands: no lamp there
    const covered = (side) => side === BAR_WALL_SIDE && Math.abs(z - BAR_WALL_Z) < BACKBAR_WIDTH / 2 + BACKBAR_LAMP_CLEARANCE;
    if (!covered(-1)) placements.push([-ROOM_WIDTH / 2, z, Math.PI / 2]);
    if (!covered(1)) placements.push([ROOM_WIDTH / 2, z, -Math.PI / 2]);
  }
  return placements;
}

/** The light of each lamp sits inside its shade, halfway up, at the end of the arm. */
const LIGHT_HEIGHT = WALL_LAMP_HEIGHT + (LAMP_SHADE_HEIGHT * WALL_LAMP_SCALE) / 2;
const LIGHT_OUT = WALL_LAMP_ARM_LENGTH + 0.01;

/** World positions [x, y, z] of the lamps over the front of the bar. */
export function barLampPositions() {
  const frontX = BAR_WALL_SIDE * (ROOM_WIDTH / 2 - WAINSCOT_PROTRUSION - BAR_WALL_DISTANCE - BAR_DEPTH) - BAR_WALL_SIDE * BAR_LAMPS_FRONT;
  return Array.from({ length: BAR_LAMPS_COUNT }, (_, i) => [frontX, BAR_LAMPS_HEIGHT, BAR_WALL_Z + (i - (BAR_LAMPS_COUNT - 1) / 2) * BAR_LAMPS_SPACING]);
}

/** World positions [x, y, z] of all lamp lights (wall lamps, then the lamps over the bar). */
export function wallLampLightPositions() {
  return [...wallLampPositions(), ...barLampPositions()];
}

function wallLampPositions() {
  return lampPlacements().map(([x, z, rotationY]) => [x + Math.sin(rotationY) * LIGHT_OUT, LIGHT_HEIGHT, z + Math.cos(rotationY) * LIGHT_OUT]);
}
