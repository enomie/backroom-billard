/**
 * The bar, main module with three stools: a silver plinth, a wooden block and a marble top with a slight overhang and
 * rounded corners. It stands opposite the radio with its back towards the wall (a gap for the
 * bartender), the front towards the room. Dimensions and colors: bar-constants.js. See _docs/bar.md.
 */
import * as THREE from "three";
import { woodTexture } from "./wood.js";
import { receiveWallLampsDeep } from "./wall-lamp-light.js";
import { ROOM_WIDTH, WAINSCOT_PROTRUSION } from "./room-constants.js";
import {
  BAR_WALL_SIDE,
  BAR_WALL_Z,
  BAR_WALL_DISTANCE,
  BAR_WIDTH,
  BAR_DEPTH,
  BAR_HEIGHT,
  BAR_PLINTH_HEIGHT,
  BAR_PLINTH_INSET,
  BAR_TOP_THICKNESS,
  BAR_TOP_OVERHANG,
  BAR_TOP_CORNER_RADIUS,
  BAR_TOP_EDGE_ROUND,
  BAR_COLOR_SILVER,
  BAR_COLOR_WOOD,
  BAR_COLOR_MARBLE,
  BAR_COLOR_MARBLE_VEIN,
  BAR_DRINKS_COUNT,
  BAR_BOTTLES_COUNT,
  BAR_DRINKS_MARGIN,
  BAR_DRINKS_SEED,
  BAR_RODS_RADIUS,
  BAR_RODS_SPACING,
  BAR_RODS_SIDE_MARGIN,
  BAR_RODS_END_MARGIN,
  BAR_COLOR_GOLD,
  STOOL_COUNT,
  STOOL_DISTANCE,
  STOOL_SPACING,
  STOOL_SEAT_HEIGHT,
  STOOL_SEAT_RADIUS,
  STOOL_SEAT_THICKNESS,
  STOOL_COLUMN_RADIUS,
  STOOL_FOOT_RADIUS,
  STOOL_RING_HEIGHT,
  STOOL_COLOR_SEAT,
} from "./bar-constants.js";

/** White marble with soft grey veins. */
function marbleTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f4f1ec";
  ctx.fillRect(0, 0, c.width, c.height);
  const vein = (x, y, length, width, alpha) => {
    ctx.strokeStyle = `rgba(${BAR_COLOR_MARBLE_VEIN}, ${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let angle = Math.random() * Math.PI * 2;
    for (let i = 0; i < length; i++) {
      angle += (Math.random() - 0.5) * 0.7;
      x += Math.cos(angle) * 9;
      y += Math.sin(angle) * 9;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  ctx.filter = "blur(2px)";
  for (let i = 0; i < 26; i++) vein(Math.random() * c.width, Math.random() * c.height, 30 + Math.random() * 50, 0.8 + Math.random() * 2.2, 0.15 + Math.random() * 0.3);
  ctx.filter = "blur(8px)";
  for (let i = 0; i < 10; i++) vein(Math.random() * c.width, Math.random() * c.height, 40 + Math.random() * 40, 6 + Math.random() * 10, 0.07);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** The marble of the top and of the back bar. */
export function marbleMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: BAR_COLOR_MARBLE, map: marbleTexture(), roughness: 0.12, clearcoat: 0.5, clearcoatRoughness: 0.08 });
}

/** A rounded rectangle in the XY plane (centered). */
function roundedRect(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const s = new THREE.Shape();
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + height - radius);
  s.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  s.lineTo(x + radius, y + height);
  s.quadraticCurveTo(x, y + height, x, y + height - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

/**
 * Build the bar and add it to the scene.
 * @param {THREE.Scene} scene
 * @param {{ makeGlass: Function }} glasses — the glass maker (glasses.js)
 * @param {{ makeBottle: Function }} bottles — the bottle maker (bottles.js)
 */
export function createBar(scene, glasses, bottles) {
  // Local frame: origin at the floor in the middle of the bar, +z = the front (the room), +x along the wall
  const root = new THREE.Group();
  root.name = "bar";
  const centerX = BAR_WALL_SIDE * (ROOM_WIDTH / 2 - WAINSCOT_PROTRUSION - BAR_WALL_DISTANCE - BAR_DEPTH / 2);
  root.position.set(centerX, 0, BAR_WALL_Z);
  root.rotation.y = BAR_WALL_SIDE < 0 ? Math.PI / 2 : -Math.PI / 2;

  const silver = new THREE.MeshStandardMaterial({ color: BAR_COLOR_SILVER, roughness: 0.3, metalness: 0.5, emissive: BAR_COLOR_SILVER, emissiveIntensity: 0.12 });
  const wood = new THREE.MeshStandardMaterial({ color: BAR_COLOR_WOOD, map: woodTexture({ base: "#8a5a36", repeatX: 3 }), roughness: 0.45, metalness: 0.05 });
  const marble = marbleMaterial();

  const blockHeight = BAR_HEIGHT - BAR_PLINTH_HEIGHT - BAR_TOP_THICKNESS;
  const box = (w, h, d, mat, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(0, y + h / 2, 0);
    root.add(m);
  };
  box(BAR_WIDTH - 2 * BAR_PLINTH_INSET, BAR_PLINTH_HEIGHT, BAR_DEPTH - 2 * BAR_PLINTH_INSET, silver, 0);
  box(BAR_WIDTH, blockHeight, BAR_DEPTH, wood, BAR_PLINTH_HEIGHT);

  // gold rods on the front of the wooden block, with gaps, not out to the ends
  const rodsFrom = BAR_PLINTH_HEIGHT + BAR_RODS_END_MARGIN;
  const rodsTo = BAR_HEIGHT - BAR_TOP_THICKNESS - BAR_RODS_END_MARGIN;
  const span = BAR_WIDTH - 2 * BAR_RODS_SIDE_MARGIN;
  const rodCount = Math.floor(span / BAR_RODS_SPACING) + 1;
  const gold = new THREE.MeshStandardMaterial({ color: BAR_COLOR_GOLD, roughness: 0.3, metalness: 0.45, emissive: BAR_COLOR_GOLD, emissiveIntensity: 0.22 }); // fully metallic would be black: the room has little to mirror
  const rods = new THREE.InstancedMesh(new THREE.CylinderGeometry(BAR_RODS_RADIUS, BAR_RODS_RADIUS, rodsTo - rodsFrom, 12), gold, rodCount);
  const rodMatrix = new THREE.Matrix4();
  const used = (rodCount - 1) * BAR_RODS_SPACING;
  for (let i = 0; i < rodCount; i++) {
    rodMatrix.setPosition(-used / 2 + i * BAR_RODS_SPACING, (rodsFrom + rodsTo) / 2, BAR_DEPTH / 2 + BAR_RODS_RADIUS * 0.6);
    rods.setMatrixAt(i, rodMatrix);
  }
  rods.frustumCulled = false; // the box around the instances is not known up front
  root.add(rods);

  // the top: a rounded plate with rounded edges, lying flat
  const topShape = roundedRect(BAR_WIDTH + 2 * BAR_TOP_OVERHANG, BAR_DEPTH + 2 * BAR_TOP_OVERHANG, BAR_TOP_CORNER_RADIUS);
  const plate = new THREE.ExtrudeGeometry(topShape, {
    depth: BAR_TOP_THICKNESS - 2 * BAR_TOP_EDGE_ROUND,
    bevelEnabled: true,
    bevelThickness: BAR_TOP_EDGE_ROUND,
    bevelSize: BAR_TOP_EDGE_ROUND,
    bevelSegments: 3,
    curveSegments: 10,
  });
  // texture coordinates over the plan view (the extrusion's x/y)
  plate.computeBoundingBox();
  const bb = plate.boundingBox;
  const uv = plate.attributes.uv;
  const pos = plate.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
  plate.rotateX(-Math.PI / 2); // the extrusion (z) becomes up (y), the shape's y becomes -z
  const top = new THREE.Mesh(plate, marble);
  top.position.y = BAR_HEIGHT - BAR_TOP_THICKNESS + BAR_TOP_EDGE_ROUND;
  root.add(top);

  // the stools: a padded seat on a silver column with a foot and a foot rest ring
  const leather = new THREE.MeshStandardMaterial({ color: STOOL_COLOR_SEAT, roughness: 0.55 });
  const part = (parent, geo, mat, y) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    parent.add(m);
  };
  for (let i = 0; i < STOOL_COUNT; i++) {
    const stool = new THREE.Group();
    stool.position.set((i - (STOOL_COUNT - 1) / 2) * STOOL_SPACING, 0, BAR_DEPTH / 2 + STOOL_DISTANCE);
    const column = STOOL_SEAT_HEIGHT - STOOL_SEAT_THICKNESS;
    part(stool, new THREE.CylinderGeometry(STOOL_FOOT_RADIUS, STOOL_FOOT_RADIUS + 0.01, 0.025, 32), silver, 0.0125);
    part(stool, new THREE.CylinderGeometry(STOOL_COLUMN_RADIUS, STOOL_COLUMN_RADIUS, column, 16), silver, column / 2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(STOOL_FOOT_RADIUS * 0.9, 0.012, 8, 32), silver);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = STOOL_RING_HEIGHT;
    stool.add(ring);
    part(stool, new THREE.CylinderGeometry(STOOL_SEAT_RADIUS, STOOL_SEAT_RADIUS - 0.01, STOOL_SEAT_THICKNESS, 32), leather, STOOL_SEAT_HEIGHT - STOOL_SEAT_THICKNESS / 2);
    root.add(stool);
  }

  receiveWallLampsDeep(root);

  // a few drinks and bottles at random places on the top (added after the lamp light: their materials are shared and already have it)
  let seed = BAR_DRINKS_SEED;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const kinds = ["wine-red", "wine-white", "beer", "whiskey", "white-russian"];
  const placed = [];
  const place = (object, radius) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = (rnd() - 0.5) * (BAR_WIDTH - 2 * BAR_DRINKS_MARGIN);
      const z = (rnd() - 0.5) * (BAR_DEPTH - 2 * BAR_DRINKS_MARGIN);
      if (placed.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + radius + 0.03)) continue;
      object.position.set(x, BAR_HEIGHT, z);
      object.rotation.y = rnd() * Math.PI * 2;
      root.add(object);
      placed.push({ x, z, r: radius });
      return;
    }
  };
  for (let i = 0; i < BAR_DRINKS_COUNT; i++) {
    const glass = glasses.makeGlass(kinds[Math.floor(rnd() * kinds.length)]);
    place(glass.group, glass.radius);
  }
  for (let i = 0; i < BAR_BOTTLES_COUNT; i++) place(bottles.makeBottle(rnd() < 0.5 ? "wine" : "beer"), 0.04);

  scene.add(root);
  return { group: root };
}
