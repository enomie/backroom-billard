/**
 * Subtle wall lamps: cone shade (like the ceiling lamps, just smaller) on a brass arm that reaches
 * out of the wall; the light points down. Counts, sizes and light values: room-constants.js.
 */
import * as THREE from "three";
import { createLampShadeMaterials } from "./ceiling-lamps.js";
import {
  ROOM_LENGTH,
  ROOM_WIDTH,
  LAMP_SHADE_RADIUS,
  LAMP_SHADE_HEIGHT,
  WALL_LAMPS_PER_SHORT_WALL,
  WALL_LAMPS_PER_LONG_WALL,
  WALL_LAMP_ARM_LENGTH,
  WALL_LAMP_HEIGHT,
  WALL_LAMP_SCALE,
  WALL_LAMP_STEM,
  WALL_LAMP_COLOR_BRASS,
  WALL_LAMP_LIGHT_COLOR,
  WALL_LAMP_LIGHT_INTENSITY,
  WALL_LAMP_LIGHT_ANGLE,
  WALL_LAMP_LIGHT_PENUMBRA,
  WALL_LAMP_LIGHT_DECAY,
  WALL_LAMP_LIGHT_DISTANCE,
} from "./room-constants.js";

/** Evenly spread `count` positions along a wall of the given length, centered on 0. */
function spread(count, length) {
  return Array.from({ length: count }, (_, i) => ((i + 0.5) / count - 0.5) * length);
}

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
  const lampTransforms = []; // world matrix of each lamp's frame
  const lampLights = new THREE.Group();

  /**
   * One lamp. Local frame: origin on the wall surface, +z points into the room, +y up.
   * @param {number} x
   * @param {number} z
   * @param {number} rotationY — makes local +z point into the room
   */
  const addLamp = (x, z, rotationY) => {
    lampTransforms.push(new THREE.Matrix4().makeRotationY(rotationY).setPosition(x, 0, z));

    // Subtle light inside the shade, pointing down
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, z);
    lamp.rotation.y = rotationY;
    const light = new THREE.SpotLight(
      WALL_LAMP_LIGHT_COLOR,
      WALL_LAMP_LIGHT_INTENSITY,
      WALL_LAMP_LIGHT_DISTANCE,
      WALL_LAMP_LIGHT_ANGLE,
      WALL_LAMP_LIGHT_PENUMBRA,
      WALL_LAMP_LIGHT_DECAY
    );
    light.position.set(0, rimY + shadeHeight * 0.5, shadeZ);
    light.target.position.set(0, 0, shadeZ);
    lamp.add(light, light.target);
    lampLights.add(lamp);
  };

  // Short walls (z = ±length/2): lamps spread along x; long walls (x = ±width/2): along z
  for (const x of spread(WALL_LAMPS_PER_SHORT_WALL, ROOM_WIDTH)) {
    addLamp(x, -ROOM_LENGTH / 2, 0); // inward = +z
    addLamp(x, ROOM_LENGTH / 2, Math.PI); // inward = −z
  }
  for (const z of spread(WALL_LAMPS_PER_LONG_WALL, ROOM_LENGTH)) {
    addLamp(-ROOM_WIDTH / 2, z, Math.PI / 2); // inward = +x
    addLamp(ROOM_WIDTH / 2, z, -Math.PI / 2); // inward = −x
  }

  for (const [geometry, material, position] of parts) {
    const mesh = new THREE.InstancedMesh(geometry, material, lampTransforms.length);
    const local = new THREE.Matrix4().makeTranslation(...position);
    lampTransforms.forEach((transform, i) => mesh.setMatrixAt(i, transform.clone().multiply(local)));
    group.add(mesh);
  }
  group.add(lampLights);

  scene.add(group);
  return { group };
}
