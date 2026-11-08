/**
 * Smoking with the T key: hold T and the player's glowing cigarette flies from the ashtray to
 * the mouth; the longer T is held, the harder the drag (brighter ember, longer intake sound). On
 * release the cigarette flies back into its notch and the player exhales: more smoke after a
 * longer drag. A cigarette that burns down while it is smoked is flown above its ashtray and
 * dropped in from 10 cm. See _docs/cigarettes.md.
 */
import * as THREE from "three";
import { startDragSound, playExhaleSound } from "./smoke-sounds.js";
import { ASHTRAY_HEIGHT, ASHTRAY_FLOOR } from "./ashtray-constants.js";
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
  SMOKING_DROP_HEIGHT,
  SMOKING_DROP_BOUNCE,
  SMOKING_DROP_SPIN,
  SMOKING_DROP_SPREAD,
  CIGARETTE_DIAMETER,
} from "./cigarette-constants.js";

const ease = (k) => k * k * (3 - 2 * k);

/**
 * @param {{ playerCigarette: (camera: THREE.Camera) => any }} cigarettes
 * @param {{ trigger: (camera: THREE.Camera, strength: number) => void }} exhale
 */
export function createSmoking(cigarettes, exhale) {
  /** @type {"idle" | "in" | "drawing" | "out" | "fall"} */
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
  /** Where the cigarette flies after the drag: its notch, or above the dish when it is burnt down. */
  const target = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  let dropping = false;
  const fall = { center: new THREE.Vector3(), velocity: new THREE.Vector3(), spin: new THREE.Vector3(), landing: new THREE.Vector3(), length: 0.03 };
  const _axis = new THREE.Vector3();
  const _q = new THREE.Quaternion();

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

  /** The drag is over: exhale and fly the cigarette back (or, if it is burnt down, to above its ashtray). */
  function endDrag(camera) {
    const strength = Math.max(SMOKING_MIN_STRENGTH, Math.min(1, drawTime / SMOKING_MAX_DRAW));
    dragSound?.stop();
    dragSound = null;
    exhale.trigger(camera, strength);
    playExhaleSound(strength);
    flightStart.position.copy(cigarette.root.position);
    flightStart.quaternion.copy(cigarette.root.quaternion);
    dropping = cigarette.burn >= 1;
    if (dropping) {
      // 10 cm above the middle of the dish, a little to the side, lying flat in a random direction
      const slot = cigarette.slot;
      const r = Math.random() * SMOKING_DROP_SPREAD * slot.scale;
      const a = Math.random() * Math.PI * 2;
      fall.landing.set(slot.x + Math.cos(a) * r, slot.y + ASHTRAY_FLOOR * slot.scale, slot.z + Math.sin(a) * r);
      target.position.set(fall.landing.x, slot.y + ASHTRAY_HEIGHT * slot.scale + SMOKING_DROP_HEIGHT, fall.landing.z);
      target.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2).multiply(_q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (Math.random() - 0.5) * 1.2));
    } else {
      target.position.copy(cigarette.rest.position);
      target.quaternion.copy(cigarette.rest.quaternion);
    }
    phase = "out";
    time = 0;
  }

  /** Put the root (the filter end) so that the middle of the butt is at `fall.center`. */
  function placeRoot() {
    const axis = _axis.set(1, 0, 0).applyQuaternion(cigarette.root.quaternion);
    cigarette.root.position.copy(fall.center).addScaledVector(axis, -fall.length / 2);
  }

  /** Turn the butt so that its axis gets the (normalized) direction `axis`, keeping the rest of the orientation. */
  function turnAxisTo(axis) {
    const current = _axis.set(1, 0, 0).applyQuaternion(cigarette.root.quaternion).clone();
    cigarette.root.quaternion.premultiply(_q.setFromUnitVectors(current, axis));
  }

  /** The butt falls into the dish: gravity, a few bounces, and it settles lying flat. Returns true when it rests. */
  function stepFall(dt) {
    const half = fall.length / 2;
    const slot = cigarette.slot;
    const ground = slot.y + ASHTRAY_FLOOR * slot.scale + CIGARETTE_DIAMETER / 2;
    fall.velocity.y -= 9.81 * dt;
    fall.center.addScaledVector(fall.velocity, dt);
    if (fall.spin.lengthSq() > 1e-6) {
      cigarette.root.quaternion.premultiply(_q.setFromAxisAngle(_axis.copy(fall.spin).normalize(), fall.spin.length() * dt));
    }
    const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(cigarette.root.quaternion);
    const lowest = fall.center.y - Math.abs(axis.y) * half;
    let settled = false;
    if (lowest < ground && fall.velocity.y < 0) {
      fall.center.y += ground - lowest;
      fall.velocity.y = -fall.velocity.y * SMOKING_DROP_BOUNCE;
      fall.velocity.x += (Math.random() - 0.5) * 0.15;
      fall.velocity.z += (Math.random() - 0.5) * 0.15;
      fall.spin.multiplyScalar(0.4);
      settled = fall.velocity.y < 0.25;
      axis.y *= settled ? 0 : 0.4; // each bounce lays it flatter; the last one lays it flat
      turnAxisTo(axis.normalize());
      if (settled) fall.center.y = ground;
    }
    placeRoot();
    if (settled) {
      cigarette.rest.position.copy(cigarette.root.position);
      cigarette.rest.quaternion.copy(cigarette.root.quaternion);
    }
    return settled;
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
      endDrag(camera);
    },
    update(dt, camera) {
      if (phase === "idle") return;
      time += dt;
      // burnt down while smoking: let go of it (the drag ends here)
      if ((phase === "in" || phase === "drawing") && cigarette.burn >= 1) endDrag(camera);
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
        fly(flightStart, target, time / SMOKING_FLY_OUT);
        cigarette.drawGlow = Math.max(0, cigarette.drawGlow - dt / SMOKING_FLY_OUT);
        if (time >= SMOKING_FLY_OUT) {
          cigarette.drawGlow = 0;
          if (dropping) {
            // let go of the butt above the ashtray
            fall.velocity.set(0, 0, 0);
            fall.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(SMOKING_DROP_SPIN);
            fall.length = Math.max(0.02, cigarette.tipX);
            fall.center.copy(cigarette.root.position).addScaledVector(_axis.set(1, 0, 0).applyQuaternion(cigarette.root.quaternion), fall.length / 2);
            phase = "fall";
          } else {
            cigarette.root.position.copy(cigarette.rest.position);
            cigarette.root.quaternion.copy(cigarette.rest.quaternion);
            phase = "idle";
            cigarette = null;
          }
        }
      } else if (phase === "fall") {
        // fixed small steps, so the bounce looks the same at any frame rate
        for (let left = Math.min(dt, 0.1); left > 0 && phase === "fall"; left -= 1 / 240) {
          if (stepFall(Math.min(left, 1 / 240))) {
            phase = "idle";
            cigarette = null;
          }
        }
      }
    },
  };
}
