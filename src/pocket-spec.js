/**
 * pocket-spec.js — Single Source of Truth für Tisch-Taschen (CSG & Physik)
 */
import * as THREE from "three";
import {
  BALL_RADIUS_REAL,
  POCKET_R_CORNER,
  POCKET_R_SIDE,
  POCKET_CORNER_OFFSET_FACTOR,
  POCKET_SIDE_OFFSET_FACTOR,
  POCKET_OVERHANG_TOP,
  POCKET_DEPTH_BOTTOM,
  CUSHION_END_RECESS_CORNER,
  CUSHION_END_RECESS_SIDE,
  POCKET_FUNNEL_DEPTH,
  POCKET_TUBE_CORNER_OFFSET,
  POCKET_TUBE_CORNER_R,
  POCKET_TUBE_SIDE_OFFSET,
  POCKET_TUBE_SIDE_R,
} from "./table-constants.js";

export { BALL_RADIUS_REAL };

export const POCKET_DIM_DEFAULTS = {
  r_corner: POCKET_R_CORNER,
  r_side: POCKET_R_SIDE,
  cornerOffsetFactor: POCKET_CORNER_OFFSET_FACTOR,
  sideOffsetFactor: POCKET_SIDE_OFFSET_FACTOR,
  overhangTop: POCKET_OVERHANG_TOP,
  depthBottom: POCKET_DEPTH_BOTTOM,
};

/**
 * Abstand der Gummi-Spitzen (Mouth-Maße) von der Nasenlinien-Ecke (Ecke) bzw. von der Tischmitte (Seite). Single Source für Banden-Physik und CSG.
 *
 * @param {typeof POCKET_DIM_DEFAULTS} [dims]
 * @returns {{ cornerTip: number; sideTip: number }}
 */
export function cushionTipOffsets(dims = POCKET_DIM_DEFAULTS) {
  return {
    // Eckentasche: Spitzenabstand (Mouth) = 2·r_corner → je Bande r·√2 von der Nasenlinien-Ecke
    cornerTip: dims.r_corner * Math.SQRT2,
    // Seitentasche: Mouth = 2·r_side → Spitzen bei z = ±r_side
    sideTip: dims.r_side,
  };
}

/** Konvexe Hülle (Monotone Chain) von [x, z]-Punkten. */
function convexHull(points) {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function circlePoints(cx, cz, r, n = 24) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return out;
}

/**
 * Taschen-Ausschnitt (Draufsicht, konvex): Spitzen der Bande, Verlängerung der Endflächen
 * (Trichter) und das Taschenrohr dahinter. Genau diese Kontur schneidet Filz/Holz aus.
 *
 * @param {number} hwN — halbe Spielfeldbreite an der Nasenlinie
 * @param {number} hlN — halbe Spielfeldlänge an der Nasenlinie
 * @param {string} id — z. B. "corner-tr", "side-l"
 * @returns {Array<[number, number]>}
 */
function pocketCavityPolygon(hwN, hlN, id, dims = POCKET_DIM_DEFAULTS) {
  const { cornerTip: a, sideTip: s } = cushionTipOffsets(dims);
  const D = POCKET_FUNNEL_DEPTH;
  const sx = id.endsWith("l") ? -1 : 1;

  if (id.startsWith("side")) {
    const k = CUSHION_END_RECESS_SIDE;
    return convexHull([
      [sx * hwN, s],
      [sx * hwN, -s],
      [sx * (hwN + D), s + k * D],
      [sx * (hwN + D), -(s + k * D)],
      ...circlePoints(sx * (hwN + POCKET_TUBE_SIDE_OFFSET), 0, POCKET_TUBE_SIDE_R),
    ]);
  }

  const sz = id.includes("-t") ? -1 : 1;
  const k = CUSHION_END_RECESS_CORNER;
  return convexHull([
    [sx * hwN, sz * (hlN - a)],
    [sx * (hwN - a), sz * hlN],
    [sx * (hwN + D), sz * (hlN - a - k * D)],
    [sx * (hwN - a - k * D), sz * (hlN + D)],
    ...circlePoints(
      sx * (hwN + POCKET_TUBE_CORNER_OFFSET),
      sz * (hlN + POCKET_TUBE_CORNER_OFFSET),
      POCKET_TUBE_CORNER_R
    ),
  ]);
}

/**
 * Erzeugt die verbindlichen PocketSpecs für CSG-Ausschnitte und Versenk-Checks.
 *
 * @param {Object} table
 * @param {number} table.playW — WPA Spielfeldbreite (1,27 m)
 * @param {number} table.playL — WPA Spielfeldlänge (2,54 m)
 * @param {number} table.tableH — Filzeroberfläche Y
 * @param {number} table.cushionH — CUSHION_NOSE_TO_BED (Blueprint railH)
 * @param {typeof POCKET_DIM_DEFAULTS} [dims]
 * @returns {Array<{
 *   id: string;
 *   center: [number, number, number];
 *   radius: number;
 *   height: number;
 *   yTop: number;
 *   yBottom: number;
 *   axis: [number, number, number];
 * }>}
 */
export function createPocketSpecs(table, dims = POCKET_DIM_DEFAULTS) {
  // playW/playL = Nase zu Nase → hw/hl liegen auf der Nasenlinie
  const hw = table.playW / 2;
  const hl = table.playL / 2;

  const yTop = table.tableH + table.cushionH + dims.overhangTop;
  const yBottom = table.tableH - dims.depthBottom;
  const height = yTop - yBottom;
  const yCenter = (yTop + yBottom) / 2;

  /** Schnittpunkt der Nasenlinien, dann leicht nach außen. */
  const cornerOut = dims.r_corner * dims.cornerOffsetFactor;
  const sideOut = dims.r_side * dims.sideOffsetFactor;

  const pockets = [
    {
      id: "corner-tl",
      x: -(hw + cornerOut),
      z: -(hl + cornerOut),
      radius: dims.r_corner,
    },
    {
      id: "corner-tr",
      x: hw + cornerOut,
      z: -(hl + cornerOut),
      radius: dims.r_corner,
    },
    {
      id: "corner-bl",
      x: -(hw + cornerOut),
      z: hl + cornerOut,
      radius: dims.r_corner,
    },
    {
      id: "corner-br",
      x: hw + cornerOut,
      z: hl + cornerOut,
      radius: dims.r_corner,
    },
    {
      id: "side-l",
      x: -(hw + sideOut),
      z: 0,
      radius: dims.r_side,
    },
    {
      id: "side-r",
      x: hw + sideOut,
      z: 0,
      radius: dims.r_side,
    },
  ];

  return pockets.map((p) => ({
    id: p.id,
    cavity: pocketCavityPolygon(hw, hl, p.id, dims),
    center: [p.x, yCenter, p.z],
    radius: p.radius,
    height,
    yTop,
    yBottom,
    axis: /** @type {const} */ ([0, 1, 0]),
  }));
}

/**
 * @param {{ x: number; y: number; z: number }} ballPos
 * @param {number} ballRadius
 * @param {ReturnType<typeof createPocketSpecs>} pocketSpecs
 * @param {number} tableH — Filzebene Y
 * @returns {string | null}
 */
export function checkPocketSink(ballPos, ballRadius, pocketSpecs, tableH) {
  for (let i = 0; i < pocketSpecs.length; i++) {
    const p = pocketSpecs[i];

    // Rollende Kugel: Mittelpunkt auf tableH + ballRadius. Nur fliegende Kugeln (Sprung) auslassen.
    if (ballPos.y > tableH + ballRadius * 1.5 || ballPos.y < p.yBottom) {
      continue;
    }

    const dx = ballPos.x - p.center[0];
    const dz = ballPos.z - p.center[2];

    if (dx * dx + dz * dz < p.radius * p.radius) {
      return p.id;
    }
  }
  return null;
}

/**
 * Wireframe-Zylinder zu allen PocketSpecs (Debug vor / neben CSG).
 *
 * @param {import("three").Scene} scene
 * @param {ReturnType<typeof createPocketSpecs>} pocketSpecs
 * @returns {import("three").Group}
 */
export function addPocketDebugMeshes(scene, pocketSpecs) {
  const group = new THREE.Group();
  group.name = "pocket-debug-group";

  for (const spec of pocketSpecs) {
    const geom = new THREE.CylinderGeometry(
      spec.radius,
      spec.radius,
      spec.height,
      24
    );
    const mat = new THREE.MeshBasicMaterial({
      color: spec.id.startsWith("corner") ? 0xff4444 : 0xffaa00,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(spec.center[0], spec.center[1], spec.center[2]);
    group.add(mesh);
  }

  scene.add(group);
  return group;
}
