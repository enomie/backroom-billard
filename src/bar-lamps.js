/**
 * The lamps hanging over the bar: the same shade as the ceiling and the wall lamps (blue outside,
 * golden inside), smaller, on a cable from the ceiling. Their light is added in the shader of the
 * materials (wall-lamp-light.js, the positions: wall-lamp-places.js). See _docs/bar.md.
 */
import * as THREE from "three";
import { createLampShadeMaterials } from "./ceiling-lamps.js";
import { ROOM_HEIGHT, LAMP_SHADE_RADIUS, LAMP_SHADE_HEIGHT, LAMP_COLOR_CABLE } from "./room-constants.js";
import { receiveWallLamps } from "./wall-lamp-light.js";
import { barLampPositions } from "./wall-lamp-places.js";
import { BAR_LAMPS_SCALE } from "./bar-constants.js";

/** @param {THREE.Scene} scene */
export function createBarLamps(scene) {
  const group = new THREE.Group();
  group.name = "bar-lamps";
  const shadeRadius = LAMP_SHADE_RADIUS * BAR_LAMPS_SCALE;
  const shadeHeight = LAMP_SHADE_HEIGHT * BAR_LAMPS_SCALE;
  const shadeGeo = new THREE.ConeGeometry(shadeRadius, shadeHeight, 32, 1, true);
  const { outside: outsideMat, inside: insideMat } = createLampShadeMaterials();
  const cableMat = new THREE.MeshStandardMaterial({ color: LAMP_COLOR_CABLE, roughness: 0.8 });
  for (const m of [outsideMat, insideMat, cableMat]) receiveWallLamps(m);

  for (const [x, y, z] of barLampPositions()) {
    // (x, y, z) is the light, in the middle of the shade; the shade: apex up, open at the bottom
    const lamp = new THREE.Group();
    lamp.position.set(x, y, z);
    const cableLength = ROOM_HEIGHT - (y + shadeHeight / 2);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, cableLength, 8), cableMat);
    cable.position.y = shadeHeight / 2 + cableLength / 2;
    lamp.add(new THREE.Mesh(shadeGeo, outsideMat), new THREE.Mesh(shadeGeo, insideMat), cable);
    group.add(lamp);
  }
  scene.add(group);
  return group;
}
