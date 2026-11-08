/**
 * Smoking with the T key: hold T and the player's glowing cigarette flies from the ashtray to
 * the mouth; the longer T is held, the harder the drag (brighter ember, longer intake sound). On
 * release the cigarette flies back into its notch and the player exhales: more smoke after a
 * longer drag. See _docs/cigarettes.md.
 */
import * as THREE from "three";
import { startDragSound, playExhaleSound } from "./smoke-sounds.js";
import {
  SMOKING_FLY_IN,
  SMOKING_FLY_OUT,
  SMOKING_ARC,
  SMOKING_MAX_DRAW,
  SMOKING_MIN_STRENGTH,
  SMOKING_MOUTH_FORWARD,
  SMOKING_MOUTH_DOWN,
  SMOKING_MOUTH_RIGHT,
  SMOKING_MOUTH_TILT,
  SMOKING_GLOW_RISE,
} from "./cigarette-constants.js";

const ease = (k) => k * k * (3 - 2 * k);

/**
 * @param {{ playerCigarette: (camera: THREE.Camera) => any }} cigarettes
 * @param {{ trigger: (camera: THREE.Camera, strength: number) => void }} exhale
 */
export function createSmoking(cigarettes, exhale) {
  /** @type {"idle" | "in" | "drawing" | "out"} */
  let phase = "idle";
  let cigarette = null;
  let time = 0; // time in the current phase
  let drawTime = 0;
  let dragSound = null;
  const mouth = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  const flightStart = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, Math.tan(SMOKING_MOUTH_TILT), 0).normalize());
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  /** The cigarette at the mouth, pointing along the view (the filter end at the lips). */
  function updateMouth(camera) {
    camera.getWorldDirection(forward);
    mouth.position.copy(camera.position).addScaledVector(forward, SMOKING_MOUTH_FORWARD).addScaledVector(new THREE.Vector3(0, 1, 0), -SMOKING_MOUTH_DOWN).addScaledVector(right.set(1, 0, 0).applyQuaternion(camera.quaternion), SMOKING_MOUTH_RIGHT);
    // local +x (filter → tip) points along the camera's forward (−z), tilted up a little
    mouth.quaternion.copy(camera.quaternion).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1))).multiply(tilt);
  }

  /** Fly from `from` to `to` along a small arc; k = 0…1. */
  function fly(from, to, k) {
    const e = ease(THREE.MathUtils.clamp(k, 0, 1));
    cigarette.root.position.lerpVectors(from.position, to.position, e);
    cigarette.root.position.y += Math.sin(Math.PI * e) * SMOKING_ARC;
    cigarette.root.quaternion.slerpQuaternions(from.quaternion, to.quaternion, e);
  }

  return {
    /** T pressed: fetch the cigarette. */
    press(camera) {
      if (phase !== "idle") return;
      cigarette = cigarettes.playerCigarette(camera);
      if (!cigarette) return; // nothing left to smoke
      phase = "in";
      time = 0;
      drawTime = 0;
      flightStart.position.copy(cigarette.root.position);
      flightStart.quaternion.copy(cigarette.root.quaternion);
      dragSound = startDragSound();
    },
    /** T released: put the cigarette back and exhale. */
    release(camera) {
      if (phase !== "in" && phase !== "drawing") return;
      const strength = Math.max(SMOKING_MIN_STRENGTH, Math.min(1, drawTime / SMOKING_MAX_DRAW));
      dragSound?.stop();
      dragSound = null;
      exhale.trigger(camera, strength);
      playExhaleSound(strength);
      flightStart.position.copy(cigarette.root.position);
      flightStart.quaternion.copy(cigarette.root.quaternion);
      phase = "out";
      time = 0;
    },
    update(dt, camera) {
      if (phase === "idle") return;
      time += dt;
      if (phase === "in") {
        updateMouth(camera);
        fly(flightStart, mouth, time / SMOKING_FLY_IN);
        cigarette.drawGlow = Math.min(1, time / SMOKING_GLOW_RISE);
        if (time >= SMOKING_FLY_IN) [phase, time] = ["drawing", 0];
      } else if (phase === "drawing") {
        updateMouth(camera);
        drawTime += dt;
        cigarette.root.position.copy(mouth.position);
        cigarette.root.quaternion.copy(mouth.quaternion);
        cigarette.drawGlow = Math.min(1, (drawTime + SMOKING_FLY_IN) / SMOKING_GLOW_RISE);
      } else if (phase === "out") {
        fly(flightStart, cigarette.rest, time / SMOKING_FLY_OUT);
        cigarette.drawGlow = Math.max(0, cigarette.drawGlow - dt / SMOKING_FLY_OUT);
        if (time >= SMOKING_FLY_OUT) {
          cigarette.root.position.copy(cigarette.rest.position);
          cigarette.root.quaternion.copy(cigarette.rest.quaternion);
          cigarette.drawGlow = 0;
          phase = "idle";
          cigarette = null;
        }
      }
    },
  };
}
