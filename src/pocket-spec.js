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
  CUSHION_PROFILE_WIDTH,
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
 * Nasen-Spitzen der Banden an den Taschen (Abstand von der Nasenlinien-Ecke bzw. von der Mitte).
 * Rückseite des Gummis endet am runden Loch (`r` von der Lochmitte auf der Filzkante),
 * die Nase ist um `k · Gummibreite` zurückgeschnitten (Facette).
 *
 * @param {typeof POCKET_DIM_DEFAULTS} [dims]
 * @returns {{ cornerTip: number; sideTip: number }}
 */
export function cushionTipOffsets(dims = POCKET_DIM_DEFAULTS) {
  const W = CUSHION_PROFILE_WIDTH;
  return {
    cornerTip: dims.r_corner + (CUSHION_END_RECESS_CORNER - 1) * W,
    sideTip: dims.r_side + CUSHION_END_RECESS_SIDE * W,
  };
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
  // playW/playL = Nase zu Nase; die runden Löcher sitzen mit der Mitte auf der Filzkante
  const hw = table.playW / 2 + CUSHION_PROFILE_WIDTH; // Filzkante (Lochmitte liegt darauf)
  const hl = table.playL / 2 + CUSHION_PROFILE_WIDTH;

  const yTop = table.tableH + table.cushionH + dims.overhangTop;
  const yBottom = table.tableH - dims.depthBottom;
  const height = yTop - yBottom;
  const yCenter = (yTop + yBottom) / 2;

  /** Optionaler Versatz der Lochmitte nach außen (0 = genau auf der Filzkante). */
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
