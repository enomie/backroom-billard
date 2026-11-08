/**
 * Subtle wall lamps: cone shade (like the ceiling lamps, just smaller) on a brass arm that reaches
 * out of the wall; the light points down. Counts, sizes and light values: room-constants.js.
 * The lamps are no three.js lights (ten more lights would be computed for every pixel of every
 * material); their light is added by wall-lamp-light.js to the few materials it can reach.
 */
import * as THREE from "three";
import { createLampShadeMaterials } from "./ceiling-lamps.js";
import {
  LAMP_SHADE_RADIUS,
  LAMP_SHADE_HEIGHT,
  WALL_LAMP_ARM_LENGTH,
  WALL_LAMP_HEIGHT,
  WALL_LAMP_SCALE,
  WALL_LAMP_STEM,
  WALL_LAMP_COLOR_BRASS,
} from "./room-constants.js";
import { receiveWallLamps } from "./wall-lamp-light.js";
import { lampPlacements } from "./wall-lamp-places.js";

/** @param {THREE.Scene} scene */
export function createWallLamps(scene) {
  const group = new THREE.Group();
  group.name = "wall-lamps";

  const shadeRadius = LAMP_SHADE_RADIUS * WALL_LAMP_SCALE;
  const shadeHeight = LAMP_SHADE_HEIGHT * WALL_LAMP_SCALE;
  const shadeGeo = new THREE.ConeGeometry(shadeRadius, shadeHeight, 32, 1, true);
  const { outside: outsideMat, inside: insideMat } = createLampShadeMaterials();
  const brass = new THREE.MeshStandardMaterial({
    color: WALL_LAMP_COLOR_BRASS,
    roughness: 0.35,
    metalness: 0.9,
  });
  for (const material of [outsideMat, insideMat, brass]) receiveWallLamps(material);

  // Heights: shade rim → apex → stem → arm
  const rimY = WALL_LAMP_HEIGHT;
  const apexY = rimY + shadeHeight;
  const armY = apexY + WALL_LAMP_STEM;

  const plateGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24);
  plateGeo.rotateX(Math.PI / 2); // plate faces along z
  const armGeo = new THREE.CylinderGeometry(0.008, 0.008, WALL_LAMP_ARM_LENGTH, 12);
  armGeo.rotateX(Math.PI / 2);
  const stemGeo = new THREE.CylinderGeometry(0.008, 0.008, WALL_LAMP_STEM, 12);
  const knobGeo = new THREE.SphereGeometry(0.018, 16, 12);

  // All ten lamps are the same: every part is one instanced mesh (a single draw call each).
  // Part: [geometry, material, local position of the part in the lamp's frame]
  const shadeZ = WALL_LAMP_ARM_LENGTH + 0.01;
  const shadePosition = [0, rimY + shadeHeight / 2, shadeZ]; // shade: apex up, open at the bottom
  const parts = [
    [plateGeo, brass, [0, armY, 0.01]], // wall plate
    [armGeo, brass, [0, armY, WALL_LAMP_ARM_LENGTH / 2 + 0.01]], // arm reaching out of the wall
    [knobGeo, brass, [0, armY, WALL_LAMP_ARM_LENGTH + 0.01]], // knob at the arm end
    [stemGeo, brass, [0, armY - WALL_LAMP_STEM / 2, WALL_LAMP_ARM_LENGTH + 0.01]], // stem down to the shade
    [shadeGeo, outsideMat, shadePosition],
    [shadeGeo, insideMat, shadePosition],
  ];
  const lampTransforms = lampPlacements().map(([x, z, rotationY]) => new THREE.Matrix4().makeRotationY(rotationY).setPosition(x, 0, z));

  for (const [geometry, material, position] of parts) {
    const mesh = new THREE.InstancedMesh(geometry, material, lampTransforms.length);
    const local = new THREE.Matrix4().makeTranslation(...position);
    lampTransforms.forEach((transform, i) => mesh.setMatrixAt(i, transform.clone().multiply(local)));
    group.add(mesh);
  }
  scene.add(group);
  return { group };
}
