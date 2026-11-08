/**
 * Smoking with the T key (or its button): hold T and the player's glowing cigarette flies from
 * the ashtray to the mouth; the longer T is held, the harder the drag. On release it flies back
 * and the player exhales. Without a glowing cigarette, holding T first takes a new one from the
 * pack (a new pack is bought when it is empty), lights it with the lighter and then draws on it.
 * A cigarette that burns down while it is smoked is flown above its ashtray and dropped in.
 * See _docs/cigarettes.md.
 */
import * as THREE from "three";
import { startDragSound, playExhaleSound } from "./smoke-sounds.js";
import { playLighterOpen, playLighterFlick, playLighterClose } from "./lighter-sounds.js";
import { PACK_SIZE } from "./cigarette-pack.js";
import { PACK_PRICE } from "./shop-constants.js";
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
  SMOKING_DROP_SPREAD,
  SMOKING_FETCH_SECONDS,
  LIGHTING_FLY,
  LIGHTING_OPEN,
  LIGHTING_HOLD,
  LIGHTING_CLOSE,
  LIGHTING_BACK,
} from "./cigarette-constants.js";

const ease = (k) => k * k * (3 - 2 * k);
const LIGHTING_TOTAL = LIGHTING_FLY + LIGHTING_OPEN + LIGHTING_HOLD + LIGHTING_CLOSE;

/** The player's side at the billard table: 0 on the −z half, 1 on the +z half. */
export const sideOf = (camera) => (camera.position.z < 0 ? 0 : 1);

/**
 * @param {{ playerCigarette: Function, spawn: Function, ignite: Function, drop: Function }} cigarettes
 * @param {{ trigger: (camera: THREE.Camera, strength: number) => void }} exhale
 * @param {{ lighters: any[] }} lighterSet
 * @param {{ packs: any[] }} packSet
 * @param {{ spend: Function, say: Function, format: Function }} wallet
 * @param {(dt: number) => void} onDraw — called every frame while the player draws (the nicotine marker moves)
 */
export function createSmoking(cigarettes, exhale, lighterSet, packSet, wallet, onDraw) {
  /** @type {"idle" | "fetch" | "light" | "in" | "drawing" | "out"} */
  let phase = "idle";
  let cigarette = null;
  let side = 0;
  let time = 0; // time in the current phase
  let drawTime = 0;
  let dragSound = null;
  let released = false; // T was let go before the drag began
  let ignited = false;
  let dropping = false;
  const pose = () => ({ position: new THREE.Vector3(), quaternion: new THREE.Quaternion() });
  const mouth = pose();
  const flightStart = pose();
  const target = pose(); // where the cigarette flies after the drag: its notch, or above the dish
  const lighterStart = pose();
  const lighterTarget = pose();
  const lighterReturn = { active: false, time: 0, from: pose(), lighter: null };
  const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, Math.tan(SMOKING_MOUTH_TILT), 0).normalize());
  const toCameraForward = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1));
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const _v = new THREE.Vector3();
  let clock = 0;

  /** The cigarette at the mouth, pointing along the view (the filter end at the lips). */
  function updateMouth(camera) {
    camera.getWorldDirection(forward);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    mouth.position
      .copy(camera.position)
      .addScaledVector(forward, SMOKING_MOUTH_FORWARD)
      .addScaledVector(_v.set(0, 1, 0), -SMOKING_MOUTH_DOWN)
      .addScaledVector(right, SMOKING_MOUTH_RIGHT);
    mouth.quaternion.copy(camera.quaternion).multiply(toCameraForward).multiply(tilt);
  }

  /** Fly an object from `from` to `to` along a small arc; k = 0…1. */
  function fly(object, from, to, k) {
    const e = ease(THREE.MathUtils.clamp(k, 0, 1));
    object.position.lerpVectors(from.position, to.position, e);
    object.position.y += Math.sin(Math.PI * e) * SMOKING_ARC;
    object.quaternion.slerpQuaternions(from.quaternion, to.quaternion, e);
  }

  const copyPose = (to, object) => {
    to.position.copy(object.position);
    to.quaternion.copy(object.quaternion);
  };

  /** The drag is over: exhale (if there was a drag) and fly the cigarette back (above its ashtray if it is burnt down). */
  function endDrag(camera) {
    if (drawTime > 0.05) {
      const strength = Math.max(SMOKING_MIN_STRENGTH, Math.min(1, drawTime / SMOKING_MAX_DRAW));
      exhale.trigger(camera, strength);
      playExhaleSound(strength);
    }
    dragSound?.stop();
    dragSound = null;
    copyPose(flightStart, cigarette.root);
    dropping = cigarette.burn >= 1;
    if (dropping) {
      // 10 cm above the middle of the dish, a little to the side, lying flat in a random direction
      const slot = cigarette.slot;
      const r = Math.random() * SMOKING_DROP_SPREAD * slot.scale;
      const a = Math.random() * Math.PI * 2;
      target.position.set(slot.x + Math.cos(a) * r, slot.y + ASHTRAY_HEIGHT * slot.scale + SMOKING_DROP_HEIGHT, slot.z + Math.sin(a) * r);
      target.quaternion.setFromAxisAngle(_v.set(0, 1, 0), Math.random() * Math.PI * 2);
    } else {
      target.position.copy(cigarette.rest.position);
      target.quaternion.copy(cigarette.rest.quaternion);
    }
    phase = "out";
    time = 0;
  }

  /** The cigarette is at the mouth and burns: the drag starts. */
  function startDrawing() {
    phase = "drawing";
    time = 0;
    drawTime = 0;
    dragSound ??= startDragSound();
  }

  /** Move the lighter along its lighting sequence; `t` = seconds since it started. */
  function stepLighting(t, camera) {
    const lighter = lighterSet.lighters[side];
    if (!ignited && t > LIGHTING_FLY + LIGHTING_OPEN + LIGHTING_HOLD * 0.4) {
      ignited = true;
      cigarettes.ignite(cigarette); // the cigarette catches fire while the flame is at its tip
    }
    // the flame has to meet the tip of the cigarette (which is at the mouth)
    cigarette.root.updateMatrixWorld();
    const tip = cigarette.root.localToWorld(_v.set(cigarette.tipX, 0, 0)).clone();
    lighterTarget.quaternion.copy(camera.quaternion);
    lighterTarget.position.copy(tip).sub(lighter.flameLocal.clone().applyQuaternion(lighterTarget.quaternion));
    if (t < LIGHTING_FLY) {
      fly(lighter.group, lighterStart, lighterTarget, t / LIGHTING_FLY);
      return;
    }
    lighter.group.position.copy(lighterTarget.position);
    lighter.group.quaternion.copy(lighterTarget.quaternion);
    const open = t - LIGHTING_FLY;
    if (open < LIGHTING_OPEN) {
      lighter.setOpen(open / LIGHTING_OPEN);
      return;
    }
    lighter.setOpen(1);
    const hold = open - LIGHTING_OPEN;
    if (hold < LIGHTING_HOLD) {
      if (!lighter.lit) {
        lighter.lit = true;
        playLighterFlick();
      }
      lighter.setFlame(true, clock);
      return;
    }
    lighter.setFlame(false);
    lighter.lit = false;
    const close = hold - LIGHTING_HOLD;
    if (close < LIGHTING_CLOSE) {
      if (!lighter.closing) {
        lighter.closing = true;
        playLighterClose();
      }
      lighter.setOpen(1 - close / LIGHTING_CLOSE);
    }
  }

  window.__sp = () => ({ phase, side, packs: packSet.packs.map((p) => p.count), c: cigarette && { burn: +cigarette.burn.toFixed(2), state: cigarette.state, held: cigarette.held } });
  return {
    /** T pressed: fetch the cigarette (a new one if there is no glowing one). */
    press(camera) {
      if (phase !== "idle") return;
      side = sideOf(camera);
      released = false;
      drawTime = 0;
      ignited = false;
      cigarette = cigarettes.playerCigarette(side);
      if (cigarette) {
        cigarette.held = true;
        phase = "in";
        time = 0;
        copyPose(flightStart, cigarette.root);
        dragSound = startDragSound();
        return;
      }
      // no cigarette: take a new one from the pack (a new pack is bought when it is empty)
      const pack = packSet.packs[side];
      if (pack.count <= 0) {
        if (!wallet.spend(PACK_PRICE)) {
          wallet.say("toast.noMoney");
          return;
        }
        wallet.say("toast.pack", { price: wallet.format(PACK_PRICE) });
        pack.setCount(PACK_SIZE);
      }
      pack.setCount(pack.count - 1);
      cigarette = cigarettes.spawn(side);
      // it comes out of the pack, filter first
      pack.group.getWorldPosition(flightStart.position);
      flightStart.position.y += 0.05;
      flightStart.quaternion.setFromUnitVectors(_v.set(1, 0, 0), new THREE.Vector3(0, -1, 0));
      copyPose(cigarette.root, flightStart);
      phase = "fetch";
      time = 0;
    },
    /** T released: put the cigarette back and exhale (a new one is lit first, then put back). */
    release(camera) {
      if (phase === "fetch" || phase === "light") {
        released = true;
        return;
      }
      if (phase === "in" || phase === "drawing") endDrag(camera);
    },
    update(dt, camera) {
      clock += dt;
      // the lighter flies back to its place (also while the drag goes on)
      if (lighterReturn.active) {
        lighterReturn.time += dt;
        const k = lighterReturn.time / LIGHTING_BACK;
        fly(lighterReturn.lighter.group, lighterReturn.from, lighterReturn.lighter.rest, k);
        if (k >= 1) lighterReturn.active = false;
      }
      if (phase === "idle") return;
      time += dt;
      // burnt down while smoking: let go of it (the drag ends here)
      if ((phase === "in" || phase === "drawing") && cigarette.burn >= 1) endDrag(camera);
      if (phase === "in" || phase === "drawing") onDraw(dt);
      if (phase === "fetch") {
        updateMouth(camera);
        fly(cigarette.root, flightStart, mouth, time / SMOKING_FETCH_SECONDS);
        if (time >= SMOKING_FETCH_SECONDS) {
          phase = "light";
          time = 0;
          const lighter = lighterSet.lighters[side];
          copyPose(lighterStart, lighter.group);
          lighter.closing = false;
          playLighterOpen();
        }
      } else if (phase === "light") {
        updateMouth(camera);
        copyPose(cigarette.root, mouth);
        stepLighting(time, camera);
        if (time >= LIGHTING_TOTAL) {
          // the lighter goes home; the cigarette burns: draw on it if T is still held
          const lighter = lighterSet.lighters[side];
          if (!ignited) {
            ignited = true;
            cigarettes.ignite(cigarette);
          }
          lighter.setOpen(0);
          lighter.setFlame(false);
          lighterReturn.active = true;
          lighterReturn.time = 0;
          lighterReturn.lighter = lighter;
          copyPose(lighterReturn.from, lighter.group);
          if (released) endDrag(camera);
          else startDrawing();
        }
      } else if (phase === "in") {
        updateMouth(camera);
        fly(cigarette.root, flightStart, mouth, time / SMOKING_FLY_IN);
        cigarette.drawGlow = Math.min(1, time / SMOKING_GLOW_RISE);
        if (time >= SMOKING_FLY_IN) {
          phase = "drawing";
          time = 0;
        }
      } else if (phase === "drawing") {
        updateMouth(camera);
        drawTime += dt;
        copyPose(cigarette.root, mouth);
        cigarette.drawGlow = Math.min(1, (drawTime + SMOKING_FLY_IN) / SMOKING_GLOW_RISE);
      } else if (phase === "out") {
        fly(cigarette.root, flightStart, target, time / SMOKING_FLY_OUT);
        cigarette.drawGlow = Math.max(0, cigarette.drawGlow - dt / SMOKING_FLY_OUT);
        if (time >= SMOKING_FLY_OUT) {
          cigarette.drawGlow = 0;
          if (dropping) {
            cigarettes.drop(cigarette); // let go of the butt above the ashtray: it falls in
          } else {
            copyPose(cigarette.root, cigarette.rest);
            cigarette.held = false;
          }
          phase = "idle";
          cigarette = null;
        }
      }
    },
  };
}
