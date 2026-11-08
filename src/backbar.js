/**
 * The back bar behind the bar: a marble wall against the long wall with three shelves, bottles
 * standing on them. Dimensions: bar-constants.js. See _docs/bar.md.
 */
import * as THREE from "three";
import { woodTexture, wainscotWoodMaterial } from "./wood.js";
import { receiveWallLampsDeep } from "./wall-lamp-light.js";
import { ROOM_WIDTH, WAINSCOT_PROTRUSION } from "./room-constants.js";
import { marbleMaterial } from "./bar.js";
import {
  BAR_WALL_SIDE,
  BAR_WALL_Z,
  BAR_COLOR_WOOD,
  BACKBAR_WIDTH,
  BACKBAR_HEIGHT,
  BACKBAR_THICKNESS,
  BACKBAR_FRAME_WIDTH,
  BACKBAR_FRAME_DEPTH,
  BACKBAR_SHELF_LEVELS,
  BACKBAR_SHELF_WIDTH,
  BACKBAR_SHELF_DEPTH,
  BACKBAR_SHELF_THICKNESS,
  BACKBAR_BOTTLE_GAP,
  BACKBAR_BOTTLE_SEED,
} from "./bar-constants.js";
import { WINE_BOTTLE_RADIUS, BEER_BOTTLE_RADIUS } from "./bottles-constants.js";

/**
 * @param {THREE.Scene} scene
 * @param {{ makeBottle: (kind: "wine" | "beer") => THREE.Group }} bottles — the bottle maker (bottles.js)
 */
export function createBackbar(scene, bottles) {
  // Local frame: origin on the floor at the wall, +z into the room, +x along the wall
  const root = new THREE.Group();
  root.name = "backbar";
  root.position.set(BAR_WALL_SIDE * (ROOM_WIDTH / 2 - WAINSCOT_PROTRUSION), 0, BAR_WALL_Z);
  root.rotation.y = BAR_WALL_SIDE < 0 ? Math.PI / 2 : -Math.PI / 2;

  const marble = new THREE.Mesh(new THREE.BoxGeometry(BACKBAR_WIDTH, BACKBAR_HEIGHT, BACKBAR_THICKNESS), marbleMaterial());
  marble.position.set(0, BACKBAR_HEIGHT / 2, BACKBAR_THICKNESS / 2);
  root.add(marble);

  // the frame around the marble (left, right, top) in the wood of the paneling; the top bar's grain runs along it
  const frameUp = wainscotWoodMaterial();
  const frameAcross = wainscotWoodMaterial();
  frameAcross.map.center.set(0.5, 0.5);
  frameAcross.map.rotation = Math.PI / 2;
  const frameBar = (w, h, x, y, mat) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, BACKBAR_FRAME_DEPTH), mat);
    bar.position.set(x, y, BACKBAR_FRAME_DEPTH / 2);
    root.add(bar);
  };
  const outerHeight = BACKBAR_HEIGHT + BACKBAR_FRAME_WIDTH;
  for (const side of [-1, 1]) frameBar(BACKBAR_FRAME_WIDTH, outerHeight, side * (BACKBAR_WIDTH + BACKBAR_FRAME_WIDTH) / 2, outerHeight / 2, frameUp);
  frameBar(BACKBAR_WIDTH + 2 * BACKBAR_FRAME_WIDTH, BACKBAR_FRAME_WIDTH, 0, BACKBAR_HEIGHT + BACKBAR_FRAME_WIDTH / 2, frameAcross);

  const wood = new THREE.MeshStandardMaterial({ color: BAR_COLOR_WOOD, map: woodTexture({ base: "#8a5a36", repeatX: 3 }), roughness: 0.45, metalness: 0.05 });
  let seed = BACKBAR_BOTTLE_SEED;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (const level of BACKBAR_SHELF_LEVELS) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(BACKBAR_SHELF_WIDTH, BACKBAR_SHELF_THICKNESS, BACKBAR_SHELF_DEPTH), wood);
    shelf.position.set(0, level - BACKBAR_SHELF_THICKNESS / 2, BACKBAR_THICKNESS + BACKBAR_SHELF_DEPTH / 2);
    root.add(shelf);
    // bottles from left to right, here and there a gap
    let x = -BACKBAR_SHELF_WIDTH / 2 + 0.1;
    for (;;) {
      const kind = rnd() < 0.5 ? "wine" : "beer";
      const r = kind === "wine" ? WINE_BOTTLE_RADIUS : BEER_BOTTLE_RADIUS;
      x += r;
      if (x + r > BACKBAR_SHELF_WIDTH / 2 - 0.1) break;
      if (rnd() > 0.2) {
        const bottle = bottles.makeBottle(kind);
        bottle.position.set(x, level, BACKBAR_THICKNESS + BACKBAR_SHELF_DEPTH / 2);
        bottle.rotation.y = (rnd() - 0.5) * 0.5; // the label to the front, a little crooked
        root.add(bottle);
      }
      x += r + BACKBAR_BOTTLE_GAP + (rnd() < 0.25 ? 0.12 : 0);
    }
  }

  receiveWallLampsDeep(root);
  scene.add(root);
  return { group: root };
}
