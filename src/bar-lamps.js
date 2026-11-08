/**
 * The lamps hanging over the front of the bar: a blue shade with a golden inside on a thin cord
 * from the ceiling. Their light is added in the shader of the materials (wall-lamp-light.js, the
 * positions: wall-lamp-places.js). See _docs/bar.md.
 */
import * as THREE from "three";
import { ROOM_HEIGHT } from "./room-constants.js";
import { barLampPositions } from "./wall-lamp-places.js";
import { BAR_LAMPS_RADIUS, BAR_LAMPS_SHADE_HEIGHT, BAR_LAMPS_COLOR } from "./bar-constants.js";

/** @param {THREE.Scene} scene */
export function createBarLamps(scene) {
  const group = new THREE.Group();
  group.name = "bar-lamps";
  const shade = new THREE.MeshStandardMaterial({ color: BAR_LAMPS_COLOR, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide });
  const inside = new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false });
  const cord = new THREE.MeshBasicMaterial({ color: 0x151515 });
  const shadeGeo = new THREE.CylinderGeometry(BAR_LAMPS_RADIUS * 0.25, BAR_LAMPS_RADIUS, BAR_LAMPS_SHADE_HEIGHT, 28, 1, true);
  const bulbGeo = new THREE.CircleGeometry(BAR_LAMPS_RADIUS * 0.93, 28).rotateX(Math.PI / 2);
  for (const [x, y, z] of barLampPositions()) {
    const lamp = new THREE.Group();
    lamp.position.set(x, y, z);
    const top = ROOM_HEIGHT - y;
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, top, 6), cord);
    wire.position.y = top / 2 + BAR_LAMPS_SHADE_HEIGHT / 2;
    const bulb = new THREE.Mesh(bulbGeo, inside);
    bulb.position.y = -BAR_LAMPS_SHADE_HEIGHT / 2 + 0.002;
    lamp.add(new THREE.Mesh(shadeGeo, shade), bulb, wire);
    group.add(lamp);
  }
  scene.add(group);
  return group;
}
