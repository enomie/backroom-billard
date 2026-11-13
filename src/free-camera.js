/**
 * The free camera (see _docs/camera.md): flies about the room with the keys, turns with the mouse or a finger,
 * stays inside the room and out of the heads of the other guests.
 */
import {
  FREE_CAM_SPEED,
  FREE_CAM_LOOK_SENSITIVITY,
  FREE_CAM_TOUCH_TURN,
  FREE_CAM_TOUCH_MOVE,
  FREE_CAM_MIN_Y,
  FREE_CAM_MAX_Y,
  FREE_CAM_START_POSITION,
  FREE_CAM_START_TARGET,
  FREE_CAM_ROOM_MARGIN,
  FREE_CAM_BACK,
  FREE_CAM_SIDE,
  FREE_CAM_UP,
  FREE_CAM_PITCH,
  FREE_CAM_HEAD_DISTANCE,
  ROOM_LENGTH,
  ROOM_WIDTH,
} from "./room-constants.js";
import { clamp } from "./math-utils.js";

/** @type {typeof import("three")} */
const THREE = window.THREE;

const PITCH_LIMIT = Math.PI / 2 - 0.01;

/** @param {{ heads: () => { x: number, y: number, z: number }[] }} options — where the heads of the other guests are */
export function createFreeCamera({ heads }) {
  const position = new THREE.Vector3(...FREE_CAM_START_POSITION);
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");

  // it starts at the observer pose (a side view on the table and the lamps)
  const start = new THREE.PerspectiveCamera(); // (a camera looks along −z: a plain object would look along +z)
  start.position.copy(position);
  start.lookAt(...FREE_CAM_START_TARGET);
  euler.setFromQuaternion(start.quaternion, "YXZ");
  let yaw = euler.y;
  let pitch = euler.x;

  function confine() {
    const m = FREE_CAM_ROOM_MARGIN;
    position.x = clamp(position.x, -ROOM_WIDTH / 2 + m, ROOM_WIDTH / 2 - m);
    position.z = clamp(position.z, -ROOM_LENGTH / 2 + m, ROOM_LENGTH / 2 - m);
    position.y = clamp(position.y, FREE_CAM_MIN_Y, FREE_CAM_MAX_Y);
    // not into the head of another guest: pushed out (two heads never take the same place, and nobody sees through a head)
    for (const head of heads()) {
      move.set(position.x - head.x, position.y - head.y, position.z - head.z);
      const distance = move.length();
      if (distance >= FREE_CAM_HEAD_DISTANCE) continue;
      if (distance < 1e-4) move.set(1, 0, 0);
      position.set(head.x, head.y, head.z).addScaledVector(move.normalize(), FREE_CAM_HEAD_DISTANCE);
    }
  }

  return {
    /** Its pose: own position and angles. */
    pose(out) {
      out.position.copy(position);
      out.quaternion.setFromEuler(euler.set(pitch, yaw, 0, "YXZ"));
    },

    /** Turn with the mouse (movement in pixels). */
    look(dx, dy) {
      yaw -= dx * FREE_CAM_LOOK_SENSITIVITY;
      pitch = clamp(pitch - dy * FREE_CAM_LOOK_SENSITIVITY, -PITCH_LIMIT, PITCH_LIMIT);
    },

    /** One finger: sideways turns, up and down moves forward and back. */
    touch(dx, dy) {
      yaw -= dx * FREE_CAM_TOUCH_TURN;
      position.addScaledVector(forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)), -dy * FREE_CAM_TOUCH_MOVE);
      confine();
    },

    /** Move with the keys (W A S D, arrows, Space and Shift for up and down). @param {Set<string>} keys — held KeyboardEvent.code */
    update(dt, keys) {
      forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      move.set(0, 0, 0);
      // (arrow keys too: near the piano the letters play)
      if (keys.has("KeyW") || keys.has("ArrowUp")) move.add(forward);
      if (keys.has("KeyS") || keys.has("ArrowDown")) move.sub(forward);
      if (keys.has("KeyD") || keys.has("ArrowRight")) move.add(right);
      if (keys.has("KeyA") || keys.has("ArrowLeft")) move.sub(right);
      if (keys.has("Space")) move.y += 1;
      if (keys.has("ShiftLeft") || keys.has("ShiftRight")) move.y -= 1;
      if (move.lengthSq() === 0) return;
      position.add(move.normalize().multiplyScalar(FREE_CAM_SPEED * dt));
      confine();
    },

    /**
     * Start back and up from the cue camera, to the side of the seat (the two seats go to different sides: not through the head of the other one).
     * @param {import("three").Camera} camera — the camera as it is now
     * @param {number} side — +1 or −1
     */
    placeBehind(camera, side) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
      forward.normalize();
      right.set(-forward.z, 0, forward.x);
      position.copy(camera.position).addScaledVector(forward, -FREE_CAM_BACK).addScaledVector(right, side * FREE_CAM_SIDE);
      position.y = clamp(position.y + FREE_CAM_UP, FREE_CAM_MIN_Y, FREE_CAM_MAX_Y);
      yaw = Math.atan2(-forward.x, -forward.z);
      pitch = FREE_CAM_PITCH;
      confine();
    },
  };
}
