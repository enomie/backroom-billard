/** The face ball in the room (see face-ball.js and _docs/multiplayer.md). Sizes in m. */
import { BAR_WALL_SIDE, BAR_WALL_Z, BAR_WALL_DISTANCE, BAR_DEPTH, BAR_WIDTH } from "./bar-constants.js";
import { ROOM_WIDTH, WAINSCOT_PROTRUSION } from "./room-constants.js";

export const FACE_BALL_RADIUS = 0.16;
/** Height of the middle of the head above the floor. */
export const FACE_BALL_HEIGHT = 1.7;
/** Next to the end of the bar (beyond its short side), in the middle of the bar's depth: x, y, z. */
export const FACE_BALL_POSITION = [
  BAR_WALL_SIDE * (ROOM_WIDTH / 2 - WAINSCOT_PROTRUSION - BAR_WALL_DISTANCE - BAR_DEPTH / 2),
  FACE_BALL_HEIGHT,
  BAR_WALL_Z + BAR_WIDTH / 2 + 0.9,
];
/** Turn about the vertical axis: 0 looks along +z; the face looks into the room (away from the bar's wall). */
export const FACE_BALL_TURN = BAR_WALL_SIDE < 0 ? Math.PI / 2 : -Math.PI / 2;
/** A click on the face counts up to this far (m). */
export const FACE_BALL_CLICK_DISTANCE = 12;
