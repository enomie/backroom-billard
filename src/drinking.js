/**
 * Drinking with the R key (or its button): a sip of the nearest player glass. The glass flies to
 * the mouth, tilts, the level falls by one fifth and the body marker moves; then it flies back.
 * See _docs/game-concept.md.
 */
import * as THREE from "three";
import { playSipSound } from "./drink-sounds.js";
import {
  DRINK_FLY_IN,
  DRINK_SIP_SECONDS,
  DRINK_FLY_OUT,
  DRINK_TILT,
  DRINK_MOUTH_FORWARD,
  DRINK_MOUTH_DOWN,
  DRINK_MOUTH_RIGHT,
  DRINK_ARC,
  DRINK_SIPS,
} from "./glasses-constants.js";

const ease = (k) => k * k * (3 - 2 * k);

/**
 * @param {{ player: any[] }} glasses
 * @param {() => void} onSip — the body marker moves
 * @param {(glass: any) => void} onEmpty — a glass is empty: ask what the player wants (the menu)
 */
export function createDrinking(glasses, onSip, onEmpty) {
  /** @type {"idle" | "in" | "sip" | "out"} */
  let phase = "idle";
  let time = 0;
  let glass = null;
  let shareFrom = 1;
  const mouth = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  const start = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const tilt = new THREE.Quaternion();
  const xAxis = new THREE.Vector3(1, 0, 0);

  /** The glass held in front of and below the camera, tilted towards the player by `angle`. */
  function updateMouth(camera, angle) {
    camera.getWorldDirection(forward);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    mouth.position
      .copy(camera.position)
      .addScaledVector(forward, DRINK_MOUTH_FORWARD)
      .addScaledVector(new THREE.Vector3(0, 1, 0), -DRINK_MOUTH_DOWN)
      .addScaledVector(right, DRINK_MOUTH_RIGHT);
    mouth.quaternion.copy(camera.quaternion).multiply(tilt.setFromAxisAngle(xAxis, angle));
  }

  function fly(from, to, k) {
    const e = ease(THREE.MathUtils.clamp(k, 0, 1));
    glass.group.position.lerpVectors(from.position, to.position, e);
    glass.group.position.y += Math.sin(Math.PI * e) * DRINK_ARC;
    glass.group.quaternion.slerpQuaternions(from.quaternion, to.quaternion, e);
  }

  return {
    /** R pressed: take a sip of the nearest glass that is not empty. */
    press(camera) {
      if (phase !== "idle") return;
      const nearest = (list) => list.reduce((a, b) => (!a || b.group.position.distanceToSquared(camera.position) < a.group.position.distanceToSquared(camera.position) ? b : a), null);
      const best = nearest(glasses.player.filter((g) => g.sipsLeft > 0));
      if (!best) {
        onEmpty(nearest(glasses.player)); // everything is drunk: order the next one
        return;
      }
      glass = best;
      start.position.copy(glass.group.position);
      start.quaternion.copy(glass.group.quaternion);
      shareFrom = glass.share;
      phase = "in";
      time = 0;
    },
    update(dt, camera) {
      if (phase === "idle") return;
      time += dt;
      if (phase === "in") {
        updateMouth(camera, 0);
        fly(start, mouth, time / DRINK_FLY_IN);
        if (time >= DRINK_FLY_IN) {
          [phase, time] = ["sip", 0];
          playSipSound();
          onSip();
        }
      } else if (phase === "sip") {
        const k = Math.min(1, time / DRINK_SIP_SECONDS);
        // tilt back and forth: up to DRINK_TILT in the middle of the sip
        updateMouth(camera, DRINK_TILT * Math.sin(Math.PI * k));
        glass.group.position.copy(mouth.position);
        glass.group.quaternion.copy(mouth.quaternion);
        glass.setShare(shareFrom - ease(k) / DRINK_SIPS);
        if (k >= 1) {
          glass.sipsLeft--;
          glass.setShare(Math.max(0, shareFrom - 1 / DRINK_SIPS));
          start.position.copy(glass.group.position);
          start.quaternion.copy(glass.group.quaternion);
          [phase, time] = ["out", 0];
        }
      } else if (phase === "out") {
        fly(start, glass.rest, time / DRINK_FLY_OUT);
        if (time >= DRINK_FLY_OUT) {
          glass.group.position.copy(glass.rest.position);
          glass.group.quaternion.copy(glass.rest.quaternion);
          const emptied = glass.sipsLeft <= 0 ? glass : null;
          phase = "idle";
          glass = null;
          if (emptied) onEmpty(emptied); // the last sip: what would the player like next?
        }
      }
    },
  };
}
