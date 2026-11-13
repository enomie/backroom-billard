/**
 * The kit of a guest without a seat (see _docs/trinken-rauchen.md): it is invisible, and appears only while he drinks or smokes, coming from
 * below and beside the face (as if out of a sleeve) and going back there. This is where it starts and ends.
 */
import * as THREE from "three";

/** The start place in front of the camera (m): ahead, below and to the right. */
export const CARRIED_FORWARD = 0.25;
export const CARRIED_DOWN = 0.32;
export const CARRIED_RIGHT = 0.25;

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

/**
 * Write the start pose for a camera (or a head view) into `pose` ({ position, quaternion }).
 * @param {THREE.Camera} camera
 * @param {{ position: THREE.Vector3, quaternion: THREE.Quaternion }} pose
 */
export function carriedStart(camera, pose) {
  camera.getWorldDirection(forward);
  right.set(1, 0, 0).applyQuaternion(camera.quaternion);
  pose.position
    .copy(camera.position)
    .addScaledVector(forward, CARRIED_FORWARD)
    .addScaledVector(up, -CARRIED_DOWN)
    .addScaledVector(right, CARRIED_RIGHT);
  pose.quaternion.copy(camera.quaternion);
}
