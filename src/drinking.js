/**
 * Drinking with the R key (or its button): hold R and the nearest player glass flies to the mouth,
 * tilts further the emptier it gets and is drunk one gulp after the other (the level falls by one
 * fifth and the body marker moves with each gulp). On release, or when the glass is empty, it
 * flies back and the player sighs after a long drink. A tap is one gulp. See _docs/game-concept.md.
 */
import * as THREE from "three";
import { playGulpSound, startFlowSound, playAhhSound } from "./drink-sounds.js";
import {
  DRINK_FLY_IN,
  DRINK_SIP_SECONDS,
  DRINK_SIP_JITTER,
  DRINK_FLY_OUT,
  DRINK_TILT_START,
  DRINK_TILT_END,
  DRINK_TILT_SECONDS,
  DRINK_AHH_MIN_GULPS,
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
  let held = false; // R is down
  let sipSeconds = DRINK_SIP_SECONDS; // the current gulp (a little different each time)
  let gulpsDone = 0;
  let sipTime = 0; // since the glass reached the mouth
  let flowSound = null;
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

  /** The next gulp begins: the body marker moves. */
  function beginGulp() {
    shareFrom = glass.share;
    sipSeconds = DRINK_SIP_SECONDS * (1 + (Math.random() * 2 - 1) * DRINK_SIP_JITTER);
    time = 0;
    onSip();
  }

  /** Drinking is over (R let go or the glass is empty): the glass flies back. */
  function beginOut() {
    flowSound?.stop();
    flowSound = null;
    if (gulpsDone >= DRINK_AHH_MIN_GULPS) playAhhSound();
    start.position.copy(glass.group.position);
    start.quaternion.copy(glass.group.quaternion);
    [phase, time] = ["out", 0];
  }

  /** The player glass nearest to the camera: the player's own. */
  function nearestGlass(camera) {
    let best = null;
    let bestDistance = Infinity;
    for (const g of glasses.player) {
      const distance = g.group.position.distanceToSquared(camera.position);
      if (distance < bestDistance) [best, bestDistance] = [g, distance];
    }
    return best;
  }

  return {
    /** True while a glass is on its way, at the mouth or on its way back. */
    isBusy() {
      return phase !== "idle";
    },
    /** R let go: the current gulp is finished, then the glass flies back. */
    release() {
      held = false;
    },
    /** Sips left in the glass R drinks from now: the one in hand, else the nearest glass (the player's own). */
    sipsLeft(camera) {
      return (glass ?? nearestGlass(camera))?.sipsLeft ?? 0;
    },
    /** R pressed: drink from the nearest glass; if it is empty, order the next one. */
    press(camera) {
      held = true;
      if (phase !== "idle") return;
      const best = nearestGlass(camera);
      if (!best) return; // no glass for him
      if (best.sipsLeft <= 0) {
        onEmpty(best);
        return;
      }
      glass = best;
      start.position.copy(glass.group.position);
      start.quaternion.copy(glass.group.quaternion);
      gulpsDone = 0;
      sipTime = 0;
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
          phase = "sip";
          flowSound = startFlowSound(glass.kind);
          beginGulp();
        }
      } else if (phase === "sip") {
        sipTime += dt;
        const k = Math.min(1, time / sipSeconds);
        // the glass tilts further the emptier it is (and swings into the tilt at the start)
        const tilt = THREE.MathUtils.lerp(DRINK_TILT_START, DRINK_TILT_END, 1 - glass.share);
        updateMouth(camera, tilt * ease(Math.min(1, sipTime / DRINK_TILT_SECONDS)));
        glass.group.position.copy(mouth.position);
        glass.group.quaternion.copy(mouth.quaternion);
        glass.setShare(shareFrom - k / DRINK_SIPS); // steadily, the gulp is heard when it is down
        if (k >= 1) {
          glass.sipsLeft--;
          gulpsDone++;
          glass.setShare(Math.max(0, shareFrom - 1 / DRINK_SIPS));
          playGulpSound();
          if (held && glass.sipsLeft > 0) beginGulp();
          else beginOut();
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
