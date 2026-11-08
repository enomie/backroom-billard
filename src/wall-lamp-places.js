/**
 * Where the ten wall lamps stand and where their light is (shared by wall-lamps.js, which builds the
 * lamps, and wall-lamp-light.js, which adds their light to the materials).
 */
import {
  ROOM_LENGTH,
  ROOM_WIDTH,
  LAMP_SHADE_HEIGHT,
  WALL_LAMPS_PER_SHORT_WALL,
  WALL_LAMPS_PER_LONG_WALL,
  WALL_LAMP_ARM_LENGTH,
  WALL_LAMP_HEIGHT,
  WALL_LAMP_SCALE,
} from "./room-constants.js";

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
    placements.push([-ROOM_WIDTH / 2, z, Math.PI / 2], [ROOM_WIDTH / 2, z, -Math.PI / 2]);
  }
  return placements;
}

/** The light of each lamp sits inside its shade, halfway up, at the end of the arm. */
const LIGHT_HEIGHT = WALL_LAMP_HEIGHT + (LAMP_SHADE_HEIGHT * WALL_LAMP_SCALE) / 2;
const LIGHT_OUT = WALL_LAMP_ARM_LENGTH + 0.01;

/** World positions [x, y, z] of the ten lamp lights. */
export function wallLampLightPositions() {
  return lampPlacements().map(([x, z, rotationY]) => [x + Math.sin(rotationY) * LIGHT_OUT, LIGHT_HEIGHT, z + Math.cos(rotationY) * LIGHT_OUT]);
}
