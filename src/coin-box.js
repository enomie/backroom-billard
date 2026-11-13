/**
 * The coin box on the table (only looks, no function yet): a worn metal box on the apron of the long side facing the radio,
 * in the middle, with a coin slot and a round red push button that glows a little. See _docs/table.md.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  PLAY_W,
  TABLE_H,
  CUSHION_PROFILE_WIDTH,
  RAIL_WOOD_DEPTH,
  COIN_BOX_WIDTH,
  COIN_BOX_HEIGHT,
  COIN_BOX_DEPTH,
  COIN_BOX_TOP_GAP,
  COIN_BOX_SLOT_WIDTH,
  COIN_BOX_SLOT_HEIGHT,
  COIN_BOX_BUTTON_RADIUS,
  COIN_BOX_COLOR_METAL,
  COIN_BOX_COLOR_BUTTON,
  COIN_BOX_BUTTON_GLOW,
} from "./table-constants.js";
import { RADIO_WALL_SIDE } from "./radio-constants.js";

/** @param {THREE.Scene} scene */
export function createCoinBox(scene) {
  const group = new THREE.Group();
  group.name = "coin-box";
  // local frame: +z points out of the apron, x runs along the table
  const metal = new THREE.MeshStandardMaterial({ color: COIN_BOX_COLOR_METAL, metalness: 0.5, roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });

  const body = new THREE.Mesh(new RoundedBoxGeometry(COIN_BOX_WIDTH, COIN_BOX_HEIGHT, COIN_BOX_DEPTH, 3, 0.008), metal);
  body.position.z = COIN_BOX_DEPTH / 2;
  body.castShadow = true;
  group.add(body);

  const face = COIN_BOX_DEPTH;
  // the coin slot in a small raised strip near the top
  const stripY = COIN_BOX_HEIGHT * 0.28;
  const strip = new THREE.Mesh(new RoundedBoxGeometry(COIN_BOX_SLOT_WIDTH * 1.8, 0.024, 0.008, 2, 0.003), metal);
  strip.position.set(0, stripY, face + 0.002);
  group.add(strip);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(COIN_BOX_SLOT_WIDTH, COIN_BOX_SLOT_HEIGHT, 0.002), dark);
  slot.position.set(0, stripY, face + 0.0062);
  group.add(slot);

  // the red dome button in a thin metal ring
  const buttonY = -COIN_BOX_HEIGHT * 0.12;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(COIN_BOX_BUTTON_RADIUS * 1.12, 0.003, 8, 32), metal);
  ring.position.set(0, buttonY, face + 0.001);
  group.add(ring);
  const button = new THREE.Mesh(
    new THREE.SphereGeometry(COIN_BOX_BUTTON_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: COIN_BOX_COLOR_BUTTON, emissive: COIN_BOX_COLOR_BUTTON, emissiveIntensity: COIN_BOX_BUTTON_GLOW, roughness: 0.25 })
  );
  button.rotation.x = Math.PI / 2; // the dome points out of the face
  button.scale.set(1, 0.45, 1); // flat dome
  button.position.set(0, buttonY, face);
  group.add(button);

  // four screws in the corners
  const screwGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.003, 12).rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const screw = new THREE.Mesh(screwGeo, metal);
      screw.position.set(sx * (COIN_BOX_WIDTH / 2 - 0.016), sy * (COIN_BOX_HEIGHT / 2 - 0.016), face + 0.0015);
      group.add(screw);
    }
  }

  // on the outer face of the apron (flush with the frame's outer edge), in the middle of the long side
  const outerX = PLAY_W / 2 + CUSHION_PROFILE_WIDTH + RAIL_WOOD_DEPTH;
  group.rotation.y = (RADIO_WALL_SIDE * Math.PI) / 2; // local +z → the radio's side
  group.position.set(RADIO_WALL_SIDE * outerX, TABLE_H - COIN_BOX_TOP_GAP - COIN_BOX_HEIGHT / 2, 0);
  scene.add(group);
  return group;
}
