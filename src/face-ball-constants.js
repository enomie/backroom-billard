/** The face ball in the room (see face-ball.js and _docs/multiplayer.md). Sizes in m. */
import { BAR_WALL_SIDE, BAR_WALL_Z, BAR_WALL_DISTANCE, BAR_DEPTH, BAR_WIDTH } from "./bar-constants.js";
import { ROOM_WIDTH, WAINSCOT_PROTRUSION } from "./room-constants.js";

export const FACE_BALL_RADIUS = 0.128;
/** The sign over the head (flag and name) always has this height on the screen (a share of the screen height), however far away or near the head is. */
export const FACE_SIGN_SCREEN_HEIGHT = 0.035;
/**
 * The message bubble above the sign (a guest's last chat message, see _docs/chat.md): drawn like the sign into a canvas and, like it,
 * always the same size on the screen. Sizes in canvas pixels (the sign's canvas is 80 px high and stands for FACE_SIGN_SCREEN_HEIGHT · 0.9).
 */
export const FACE_BUBBLE_MAX_LINES = 3;
export const FACE_BUBBLE_FONT_PX = 34;
export const FACE_BUBBLE_LINE_PX = 44;
export const FACE_BUBBLE_PADDING_PX = 16;
export const FACE_BUBBLE_CANVAS_WIDTH = 640;
export const FACE_BUBBLE_CANVAS_HEIGHT = FACE_BUBBLE_MAX_LINES * FACE_BUBBLE_LINE_PX + 2 * FACE_BUBBLE_PADDING_PX + 8;
/** The gap between the sign and the bubble, as a share of the screen height. */
export const FACE_BUBBLE_GAP = 0.004;
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
