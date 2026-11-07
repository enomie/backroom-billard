/**
 * The pool cue: pink rubber tip, white ferrule, light maple shaft, brass joint collar,
 * dark hardwood butt with inlay rings and a black rubber bumper.
 *
 * The group's origin is the front of the tip; the cue extends along +z (towards the player).
 */
import * as THREE from "three";

/** Total length of the cue (m); the parts below add up to this. */
export const CUE_LENGTH = 1.45;

/** Dimensions of the cue's front end, also used for the physical tip (physics-world.js). */
export const CUE_TIP_RADIUS = 0.0062;
export const CUE_FERRULE_RADIUS = 0.0064;
export const CUE_TIP_LENGTH = 0.008;
export const CUE_FERRULE_LENGTH = 0.026;

/** All values in meters, measured from the tip. */
const TIP_LENGTH = CUE_TIP_LENGTH;
const FERRULE_LENGTH = CUE_FERRULE_LENGTH;
const SHAFT_LENGTH = 0.75;
const JOINT_LENGTH = 0.014;
const BUTT_LENGTH = 0.64;
const BUMPER_LENGTH = 0.012;

const R_TIP = CUE_TIP_RADIUS;
const R_FERRULE = CUE_FERRULE_RADIUS;
const R_SHAFT_FRONT = 0.0066;
const R_SHAFT_BACK = 0.0108; // pro taper towards the joint
const R_JOINT = 0.0112;
const R_BUTT_FRONT = 0.0112;
const R_BUTT_BACK = 0.0148;

/** Wood grain running along the length (canvas lines ↔ constant u on the cylinder). */
function grainTexture(base, grainRgb, lines) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < lines; i++) {
    const x = Math.random() * 256;
    ctx.strokeStyle = `rgba(${grainRgb}, ${0.05 + Math.random() * 0.18})`;
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 10, 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Cylinder segment along z: thin end towards the tip (z0), thick end towards the butt (z1).
 * @returns {THREE.Mesh}
 */
function segment(zFront, zBack, rFront, rBack, material) {
  const length = zBack - zFront;
  // After rotateX(π/2) the geometry's +y (top) points to +z, i.e. towards the butt
  const geo = new THREE.CylinderGeometry(rBack, rFront, length, 32, 1);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, zFront + length / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

/** @returns {THREE.Group} */
export function createCueModel() {
  const cue = new THREE.Group();
  cue.name = "cue";

  const tipMat = new THREE.MeshStandardMaterial({ color: 0xe88aa8, roughness: 0.85 }); // pink rubber
  const ferruleMat = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.35 });
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grainTexture("#e8cc98", "150, 105, 50", 90),
    roughness: 0.3,
  });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.3, metalness: 0.9 });
  const buttMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grainTexture("#3b2214", "15, 6, 2", 110),
    roughness: 0.28,
  });
  const inlayMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.4 });
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });

  let z = 0;
  const next = (length) => {
    const from = z;
    z += length;
    return [from, z];
  };

  // Pink rubber tip: short cylinder with a domed front
  const [tipA, tipB] = next(TIP_LENGTH);
  cue.add(segment(tipA + 0.002, tipB, R_TIP, R_TIP, tipMat));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R_TIP, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), tipMat);
  dome.rotation.x = -Math.PI / 2; // the dome's pole points to −z (front)
  dome.scale.y = 0.4; // squash along the pole axis (local y) → flat dome
  dome.position.z = tipA + 0.002;
  dome.castShadow = true;
  cue.add(dome);

  // White ferrule, then the maple shaft
  const [fA, fB] = next(FERRULE_LENGTH);
  cue.add(segment(fA, fB, R_FERRULE, R_FERRULE, ferruleMat));
  const [sA, sB] = next(SHAFT_LENGTH);
  cue.add(segment(sA, sB, R_SHAFT_FRONT, R_SHAFT_BACK, shaftMat));

  // Brass joint collar between the two wooden parts
  const [jA, jB] = next(JOINT_LENGTH);
  cue.add(segment(jA, jB, R_JOINT, R_JOINT, brassMat));

  // Dark butt with two inlay rings near the joint
  const [bA, bB] = next(BUTT_LENGTH);
  cue.add(segment(bA, bB, R_BUTT_FRONT, R_BUTT_BACK, buttMat));
  const radiusAt = (zz) => R_BUTT_FRONT + ((zz - bA) / (bB - bA)) * (R_BUTT_BACK - R_BUTT_FRONT);
  for (const offset of [0.05, 0.065]) {
    const zz = bA + offset;
    cue.add(segment(zz, zz + 0.004, radiusAt(zz) + 0.0002, radiusAt(zz + 0.004) + 0.0002, inlayMat));
  }

  // Black rubber bumper at the end
  const [uA, uB] = next(BUMPER_LENGTH);
  cue.add(segment(uA, uB, R_BUTT_BACK, R_BUTT_BACK, bumperMat));

  return cue;
}
