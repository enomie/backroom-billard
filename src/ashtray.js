/**
 * Glass ashtrays: a thick dish with five notches in the rim, built as a solid of revolution.
 * They stand on some round tables and on the billard table's frame (one per player).
 */
import * as THREE from "three";
import { FURNITURE_TABLES, FURNITURE_TABLE_HEIGHT } from "./furniture-constants.js";
import { PLAY_W, TABLE_H, CUSHION_NOSE_TO_BED, CUSHION_PROFILE_WIDTH, RAIL_WOOD_DEPTH } from "./table-constants.js";
import {
  ASHTRAY_RADIUS,
  ASHTRAY_HEIGHT,
  ASHTRAY_NOTCHES,
  ASHTRAY_NOTCH_DEPTH,
  ASHTRAY_NOTCH_HALF_ANGLE,
  ASHTRAY_COLOR,
  ASHTRAY_OPACITY,
  ASHTRAY_FRAME_SCALE,
  ASHTRAY_FRAME_Z,
  ASHTRAY_TABLE_SHARE,
  ASHTRAY_TABLE_RING,
  ASHTRAY_SEED,
} from "./ashtray-constants.js";
import { applyBallReflection } from "./ball-reflection.js";

/** Heavy glass dish with a flat wide rim; the rim is lowered at the notches. */
function ashtrayGeometry() {
  const R = ASHTRAY_RADIUS;
  const H = ASHTRAY_HEIGHT;
  const pts = [
    [0, 0], [R - 0.009, 0], [R - 0.002, 0.004], [R, 0.009], [R, H - 0.003], [R - 0.002, H],
    [R - 0.01, H], [R - 0.013, H - 0.004], [R - 0.022, 0.014], [R - 0.03, 0.0105], [0.02, 0.0095], [0, 0.0095],
  ];
  const geo = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 160);
  const pos = geo.attributes.position;
  const step = (Math.PI * 2) / ASHTRAY_NOTCHES;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const rim = THREE.MathUtils.smoothstep(y, H - 0.011, H); // 0 below the rim … 1 at the top
    if (rim <= 0) continue;
    const angle = Math.atan2(pos.getZ(i), pos.getX(i));
    const k = Math.round(angle / step);
    const d = Math.abs(angle - k * step);
    const bump = d < ASHTRAY_NOTCH_HALF_ANGLE ? 0.5 + 0.5 * Math.cos((Math.PI * d) / ASHTRAY_NOTCH_HALF_ANGLE) : 0;
    pos.setY(i, y - ASHTRAY_NOTCH_DEPTH * rim * bump);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Small deterministic random generator (same layout on every start). */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {THREE.Scene} scene
 * @returns {{ group: THREE.Group, taken: { x: number, z: number, r: number }[],
 *            applyReflection: (reflection: object) => void }}
 */
export function createAshtrays(scene) {
  const group = new THREE.Group();
  group.name = "ashtrays";
  const rnd = random(ASHTRAY_SEED);
  const geo = ashtrayGeometry();
  const mat = new THREE.MeshPhysicalMaterial({
    color: ASHTRAY_COLOR,
    transparent: true,
    opacity: ASHTRAY_OPACITY,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    depthWrite: false,
  });

  const taken = []; // the ashtrays on the round tables
  const place = (x, y, z, scale = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.setScalar(scale);
    m.rotation.y = rnd() * Math.PI * 2;
    m.renderOrder = 1; // after the opaque objects behind it
    group.add(m);
  };

  // Round tables: some have one, off to the side of the candle
  for (const table of FURNITURE_TABLES) {
    const angle = rnd() * Math.PI * 2;
    if (rnd() > ASHTRAY_TABLE_SHARE) continue;
    const x = table.x + Math.cos(angle) * ASHTRAY_TABLE_RING;
    const z = table.z + Math.sin(angle) * ASHTRAY_TABLE_RING;
    place(x, FURNITURE_TABLE_HEIGHT, z);
    taken.push({ x, z, r: ASHTRAY_RADIUS });
  }

  // Billard table: one per player on the left long side of the frame
  const frameX = -(PLAY_W / 2 + CUSHION_PROFILE_WIDTH + RAIL_WOOD_DEPTH / 2);
  const frameTop = TABLE_H + CUSHION_NOSE_TO_BED + 0.01;
  for (const sz of [-1, 1]) place(frameX, frameTop, sz * ASHTRAY_FRAME_Z, ASHTRAY_FRAME_SCALE);

  scene.add(group);
  return {
    group,
    taken,
    /** Let the glass reflect the room (call after the room reflection was captured). */
    applyReflection(reflection) {
      applyBallReflection(mat, reflection, { clearGlass: true });
      mat.envMapIntensity = 1.6;
    },
  };
}
