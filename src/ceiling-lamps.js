/**
 * Ceiling lamps above the table: the same lamp repeated LAMP_COUNT times.
 * Each lamp = cone shade (blue outside, golden inside) + black cable up through the ceiling
 * + a spot light with soft shadow. All parameters live in room-constants.js.
 */
import * as THREE from "three";
import {
  LAMP_COUNT,
  LAMP_HEIGHT,
  LAMP_SPACING,
  LAMP_CABLE_LENGTH,
  LAMP_SHADE_RADIUS,
  LAMP_SHADE_HEIGHT,
  LAMP_COLOR_OUTSIDE,
  LAMP_COLOR_INSIDE,
  LAMP_COLOR_CABLE,
  LAMP_LIGHT_COLOR,
  LAMP_LIGHT_INTENSITY,
  LAMP_LIGHT_ANGLE,
  LAMP_LIGHT_PENUMBRA,
  LAMP_LIGHT_DECAY,
  LAMP_LIGHT_DISTANCE,
  LAMP_SHADOW_MAP_SIZE,
  LAMP_SHADOW_RADIUS,
  LAMP_REFLECTION_GLOW,
} from "./room-constants.js";

/** Layer of objects that only the reflection capture sees (ball-reflection.js). */
export const REFLECTION_LAYER = 1;

/** Blue outside / golden inside shade materials, shared by the ceiling and the wall lamps. */
export function createLampShadeMaterials() {
  const outside = new THREE.MeshStandardMaterial({
    color: LAMP_COLOR_OUTSIDE,
    emissive: LAMP_COLOR_OUTSIDE, // slight self-glow so the blue stays readable in the dark room
    emissiveIntensity: 0.3,
    roughness: 0.35,
    metalness: 0.5,
    side: THREE.FrontSide,
  });
  const inside = new THREE.MeshStandardMaterial({
    color: LAMP_COLOR_INSIDE,
    emissive: LAMP_COLOR_INSIDE,
    emissiveIntensity: 0.55,
    roughness: 0.3,
    metalness: 0.8,
    side: THREE.BackSide,
  });
  return { outside, inside };
}

/**
 * @param {THREE.Scene} scene
 * @param {number} tableTopY — felt surface height, the light targets point here
 * @returns {{ group: THREE.Group }}
 */
export function createCeilingLamps(scene, tableTopY) {
  const group = new THREE.Group();
  group.name = "ceiling-lamps";

  // Shared geometry and materials: all lamps are identical
  const shadeGeo = new THREE.ConeGeometry(LAMP_SHADE_RADIUS, LAMP_SHADE_HEIGHT, 48, 1, true);
  const { outside: outsideMat, inside: insideMat } = createLampShadeMaterials();
  // Lit opening of the shade: a bright disc that only the reflection capture sees
  const glowRadius = LAMP_SHADE_RADIUS * (1 - 0.03 / LAMP_SHADE_HEIGHT) * 0.95;
  const glowGeo = new THREE.CircleGeometry(glowRadius, 48);
  glowGeo.rotateX(Math.PI / 2); // faces down
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(LAMP_LIGHT_COLOR).multiplyScalar(LAMP_REFLECTION_GLOW),
    toneMapped: false,
    fog: false,
  });
  const cableGeo = new THREE.CylinderGeometry(0.006, 0.006, LAMP_CABLE_LENGTH, 8);
  const cableMat = new THREE.MeshStandardMaterial({ color: LAMP_COLOR_CABLE, roughness: 0.8 });

  for (let i = 0; i < LAMP_COUNT; i++) {
    const z = (i - (LAMP_COUNT - 1) / 2) * LAMP_SPACING;

    const lamp = new THREE.Group();
    lamp.position.set(0, LAMP_HEIGHT, z); // origin = lower rim of the shade

    // Shade: apex up, so the cone's center sits half a height above the rim
    const outside = new THREE.Mesh(shadeGeo, outsideMat);
    const inside = new THREE.Mesh(shadeGeo, insideMat);
    outside.position.y = inside.position.y = LAMP_SHADE_HEIGHT / 2;
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.03;
    glow.layers.set(REFLECTION_LAYER);
    lamp.add(outside, inside, glow);

    // Cable from the apex upwards; it moves with the lamp, so it always reaches the ceiling
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.y = LAMP_SHADE_HEIGHT + LAMP_CABLE_LENGTH / 2;
    lamp.add(cable);

    group.add(lamp);

    // Spot light inside the shade, pointing straight down onto the table
    const light = new THREE.SpotLight(LAMP_LIGHT_COLOR, LAMP_LIGHT_INTENSITY);
    light.position.set(0, LAMP_HEIGHT + LAMP_SHADE_HEIGHT * 0.5, z);
    light.angle = LAMP_LIGHT_ANGLE;
    light.penumbra = LAMP_LIGHT_PENUMBRA;
    light.decay = LAMP_LIGHT_DECAY;
    light.distance = LAMP_LIGHT_DISTANCE;
    light.castShadow = true;
    light.shadow.mapSize.set(LAMP_SHADOW_MAP_SIZE, LAMP_SHADOW_MAP_SIZE);
    light.shadow.radius = LAMP_SHADOW_RADIUS;
    light.shadow.bias = -0.0003;
    light.target.position.set(0, tableTopY, z);
    group.add(light, light.target);
  }

  scene.add(group);

  return { group };
}
