/**
 * Round pedestal tables (varnished mahogany, brass column) with club armchairs in wine-red
 * leather. Built from simple shapes; the chairs are instanced. Layout: furniture-constants.js.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { woodTexture, glossyWoodMaterial } from "./wood.js";
import { receiveWallLamps } from "./wall-lamp-light.js";
import { WALL_LAMP_COLOR_BRASS } from "./room-constants.js";
import {
  FURNITURE_TABLE_RADIUS,
  FURNITURE_TABLE_HEIGHT,
  FURNITURE_TABLE_PLATE_THICKNESS,
  FURNITURE_TABLE_BASE_RADIUS,
  CHAIR_WIDTH,
  CHAIR_DEPTH,
  CHAIR_SEAT_HEIGHT,
  CHAIR_BACK_HEIGHT,
  CHAIR_COLOR_LEATHER,
  CHAIR_RING_RADIUS,
  FURNITURE_KEEP_OUT_RADIUS,
  FURNITURE_TABLES,
} from "./furniture-constants.js";

/** Table plate: a disc with a rounded edge, wood UVs lying flat so the grain runs across it. */
function plateGeometry() {
  const r = FURNITURE_TABLE_RADIUS;
  const t = FURNITURE_TABLE_PLATE_THICKNESS;
  const round = 0.012;
  const profile = [new THREE.Vector2(0, 0), new THREE.Vector2(r - round, 0)];
  for (let i = 1; i <= 4; i++) {
    const a = (i / 4) * Math.PI;
    profile.push(new THREE.Vector2(r - round + Math.sin(a) * round, t / 2 - Math.cos(a) * (t / 2)));
  }
  profile.push(new THREE.Vector2(r - round, t), new THREE.Vector2(0, t));
  const geo = new THREE.LatheGeometry(profile, 48);
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(nor.getY(i)) > 0.5) uv.setXY(i, pos.getX(i) / 0.8, pos.getZ(i) / 0.4);
  }
  return geo;
}

/** Club armchair parts (local frame: front = +z, y up), split into leather and wood. */
function chairGeometries() {
  const w = CHAIR_WIDTH;
  const d = CHAIR_DEPTH;
  const box = (sx, sy, sz, x, y, z, rotX = 0) => {
    const g = new RoundedBoxGeometry(sx, sy, sz, 3, Math.min(sx, sy, sz) * 0.3);
    g.rotateX(rotX);
    g.translate(x, y, z);
    return g;
  };
  const armW = 0.15;
  const leather = mergeGeometries([
    box(w - 2 * armW + 0.02, 0.13, d - 0.1, 0, CHAIR_SEAT_HEIGHT - 0.065, 0.03), // seat cushion
    box(w - 0.04, CHAIR_BACK_HEIGHT - CHAIR_SEAT_HEIGHT + 0.1, 0.16, 0, (CHAIR_SEAT_HEIGHT + CHAIR_BACK_HEIGHT) / 2 - 0.02, -d / 2 + 0.1, -0.1), // back
    box(armW, 0.3, d - 0.06, -(w - armW) / 2, CHAIR_SEAT_HEIGHT - 0.02, 0), // arms
    box(armW, 0.3, d - 0.06, (w - armW) / 2, CHAIR_SEAT_HEIGHT - 0.02, 0),
    box(w - 0.02, 0.14, d - 0.04, 0, 0.2, 0), // frame under the seat
  ]);
  const feet = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.035, 0.025, 0.13, 12);
      g.translate(sx * (w / 2 - 0.07), 0.065, sz * (d / 2 - 0.07));
      feet.push(g);
    }
  }
  return { leather, wood: mergeGeometries(feet) };
}

/** Fine leather grain as a bump map. */
function leatherBump() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 90;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

/**
 * @param {THREE.Scene} scene
 * @returns {{ group: THREE.Group, keepOut: { x: number, z: number, r: number }[] }}
 *   keepOut: circles (center + radius) the free camera must stay out of
 */
export function createFurniture(scene) {
  const group = new THREE.Group();
  group.name = "furniture";

  const woodMat = glossyWoodMaterial(woodTexture({ base: "#6a3018", dark: "30,12,4", light: "150,80,45" }));
  const brassMat = new THREE.MeshStandardMaterial({ color: WALL_LAMP_COLOR_BRASS, roughness: 0.35, metalness: 0.85 });
  const leatherMat = new THREE.MeshPhysicalMaterial({
    color: CHAIR_COLOR_LEATHER,
    roughness: 0.55,
    clearcoat: 0.3,
    clearcoatRoughness: 0.45,
    bumpMap: leatherBump(),
    bumpScale: 0.6,
  });

  // only the chairs next to a wall get light from the wall lamps (see wall-lamp-light.js)
  receiveWallLamps(woodMat);
  receiveWallLamps(leatherMat);

  // Table parts (shared by all tables)
  const plateGeo = plateGeometry();
  const columnHeight = FURNITURE_TABLE_HEIGHT - FURNITURE_TABLE_PLATE_THICKNESS - 0.03;
  const columnGeo = new THREE.CylinderGeometry(0.035, 0.045, columnHeight, 16);
  const baseGeo = new THREE.CylinderGeometry(FURNITURE_TABLE_BASE_RADIUS * 0.9, FURNITURE_TABLE_BASE_RADIUS, 0.03, 32);

  // Chairs: one instanced mesh for the leather, one for the feet
  const chairs = chairGeometries();
  const chairCount = FURNITURE_TABLES.reduce((n, t) => n + t.chairs.length, 0);
  const leatherChairs = new THREE.InstancedMesh(chairs.leather, leatherMat, chairCount);
  const footChairs = new THREE.InstancedMesh(chairs.wood, woodMat, chairCount);
  // The furniture stands far outside the cones of the lamps over the table (the only shadow casters),
  // so it casts no shadow: drawing it into the three shadow maps would cost a lot and show nothing.
  for (const m of [leatherChairs, footChairs]) {
    m.receiveShadow = true;
  }

  const keepOut = [];
  const matrix = new THREE.Matrix4();
  let index = 0;
  // The parts of the tables are the same everywhere: one instanced mesh each
  const plates = new THREE.InstancedMesh(plateGeo, woodMat, FURNITURE_TABLES.length);
  const columns = new THREE.InstancedMesh(columnGeo, brassMat, FURNITURE_TABLES.length);
  const bases = new THREE.InstancedMesh(baseGeo, brassMat, FURNITURE_TABLES.length);
  for (const m of [plates, columns, bases]) {
    m.receiveShadow = true;
    group.add(m);
  }
  FURNITURE_TABLES.forEach((table, i) => {
    plates.setMatrixAt(i, matrix.makeTranslation(table.x, FURNITURE_TABLE_HEIGHT - FURNITURE_TABLE_PLATE_THICKNESS, table.z));
    columns.setMatrixAt(i, matrix.makeTranslation(table.x, 0.03 + columnHeight / 2, table.z));
    bases.setMatrixAt(i, matrix.makeTranslation(table.x, 0.015, table.z));
  });
  for (const table of FURNITURE_TABLES) {
    for (const [angleDeg, pull] of table.chairs) {
      const a = THREE.MathUtils.degToRad(angleDeg);
      const dist = CHAIR_RING_RADIUS + pull;
      matrix.makeRotationY(a + Math.PI); // the front looks at the table center
      matrix.setPosition(table.x + Math.sin(a) * dist, 0, table.z + Math.cos(a) * dist);
      leatherChairs.setMatrixAt(index, matrix);
      footChairs.setMatrixAt(index, matrix);
      index++;
    }
    keepOut.push({ x: table.x, z: table.z, r: FURNITURE_KEEP_OUT_RADIUS });
  }
  group.add(leatherChairs, footChairs);
  scene.add(group);
  return { group, keepOut };
}
