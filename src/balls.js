/**
 * Meshes of the balls and their look in the HUD. One geometry and one material per ball (0 = cue ball,
 * 1–15), made once and used again for every rack. See ball-constants.js and ball-texture.js.
 */
import * as THREE from "three";
import { BALL_RADIUS_REAL } from "./table-constants.js";
import { BALL_MATERIAL, BALL_SEGMENTS, BALL_IVORY, ballColor, isStripe } from "./ball-constants.js";
import { ballTexture } from "./ball-texture.js";
import { applyBallReflection } from "./ball-reflection.js";

let geometry = null;
const materials = new Map();

/**
 * A new mesh of a ball (not yet in the scene).
 * @param {number} id — 0 = cue ball, otherwise its number
 * @param {{ texture: THREE.Texture }} reflection — the captured room (ball-reflection.js)
 */
export function createBallMesh(id, reflection) {
  geometry ??= new THREE.SphereGeometry(BALL_RADIUS_REAL, BALL_SEGMENTS, BALL_SEGMENTS);
  if (!materials.has(id)) {
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, // the color comes from the texture
      map: ballTexture(id),
      ...BALL_MATERIAL,
    });
    applyBallReflection(material, reflection);
    materials.set(id, material);
  }
  const mesh = new THREE.Mesh(geometry, materials.get(id));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const hex = (color) => "#" + color.toString(16).padStart(6, "0");

/** A pocketed ball in the HUD: a round dot in its color, a stripe with a band on ivory. */
export function ballDot(number) {
  const dot = document.createElement("span");
  dot.className = "pocketed-ball";
  dot.dataset.ballId = String(number);
  const color = hex(ballColor(number));
  dot.style.background = isStripe(number)
    ? `linear-gradient(${hex(BALL_IVORY)} 28%, ${color} 28% 72%, ${hex(BALL_IVORY)} 72%)`
    : color;
  return dot;
}
