/**
 * pocket-spec.js — single source of truth for the table pockets (CSG & physics)
 */
import {
  POCKET_MOUTH_CORNER,
  POCKET_MOUTH_SIDE,
  POCKET_MOUTH_ANGLE_CORNER_DEG,
  POCKET_MOUTH_ANGLE_SIDE_DEG,
  POCKET_SHELF_SIDE,
  POCKET_OVERHANG_TOP,
  POCKET_DEPTH_BOTTOM,
  CUSHION_PROFILE_WIDTH,
} from "./table-constants.js";

/** Facet recess per meter of rubber depth for a mouth angle (90° = square cut). */
const facetRecess = (deg) => Math.tan(((deg - 90) * Math.PI) / 180);

/**
 * Pocket geometry derived from the WPA mouth and angle.
 * `tip`: nose tip distance from the nose-line corner (corner) or from the center (side), along the cushion.
 * `k`: facet recess per meter of rubber depth; the back of the rubber (felt edge) ends at `tip − k · W`.
 * The round hole passes through these back ends: corner hole centered on the felt-edge corner, side hole
 * pushed outwards by `centerOut` so that its edge lies `POCKET_SHELF_SIDE` behind the nose line.
 */
function pocketGeometry() {
  const W = CUSHION_PROFILE_WIDTH;

  const cornerTip = POCKET_MOUTH_CORNER / Math.SQRT2;
  const cornerK = facetRecess(POCKET_MOUTH_ANGLE_CORNER_DEG);
  const cornerRadius = W + cornerTip - cornerK * W;

  const sideTip = POCKET_MOUTH_SIDE / 2;
  const sideK = facetRecess(POCKET_MOUTH_ANGLE_SIDE_DEG);
  const sideBack = sideTip - sideK * W;
  const inset = W - POCKET_SHELF_SIDE; // hole edge inside the felt edge
  const sideCenterOut = (sideBack * sideBack - inset * inset) / (2 * inset);

  return {
    corner: { tip: cornerTip, k: cornerK, radius: cornerRadius },
    side: { tip: sideTip, k: sideK, radius: sideCenterOut + inset, centerOut: sideCenterOut },
  };
}

export const POCKET_GEOMETRY = pocketGeometry();

/**
 * Dimensions of the pocket cup (catcher) below the playing plate — shared by visuals and physics.
 *
 * @param {{ center: number[]; radius: number; yBottom: number }} spec
 * @param {number} tableH
 * @param {number} feltDepth — thickness of the playing plate
 */
export function pocketCupDims(spec, tableH, feltDepth) {
  const yTop = tableH - feltDepth;
  return {
    cx: spec.center[0],
    cz: spec.center[2],
    rTop: spec.radius,
    rBottom: spec.radius * 0.9,
    yTop,
    yBottom: spec.yBottom,
    height: yTop - spec.yBottom,
  };
}

/**
 * Creates the binding pocket specs for the CSG cut-outs and pocketing checks.
 *
 * @param {Object} table
 * @param {number} table.playW — WPA playing field width (1.27 m), nose to nose
 * @param {number} table.playL — WPA playing field length (2.54 m), nose to nose
 * @param {number} table.tableH — felt surface Y
 * @param {number} table.cushionH — CUSHION_NOSE_TO_BED (Blueprint railH)
 * @returns {Array<{
 *   id: string;
 *   center: [number, number, number];
 *   radius: number;
 *   height: number;
 *   yTop: number;
 *   yBottom: number;
 * }>}
 */
export function createPocketSpecs(table) {
  const hw = table.playW / 2 + CUSHION_PROFILE_WIDTH; // felt edge
  const hl = table.playL / 2 + CUSHION_PROFILE_WIDTH;

  const yTop = table.tableH + table.cushionH + POCKET_OVERHANG_TOP;
  const yBottom = table.tableH - POCKET_DEPTH_BOTTOM;
  const yCenter = (yTop + yBottom) / 2;

  const { corner, side } = POCKET_GEOMETRY;
  const sideX = hw + side.centerOut;

  const pockets = [
    { id: "corner-tl", x: -hw, z: -hl, radius: corner.radius },
    { id: "corner-tr", x: hw, z: -hl, radius: corner.radius },
    { id: "corner-bl", x: -hw, z: hl, radius: corner.radius },
    { id: "corner-br", x: hw, z: hl, radius: corner.radius },
    { id: "side-l", x: -sideX, z: 0, radius: side.radius },
    { id: "side-r", x: sideX, z: 0, radius: side.radius },
  ];

  return pockets.map((p) => ({
    id: p.id,
    center: [p.x, yCenter, p.z],
    radius: p.radius,
    height: yTop - yBottom,
    yTop,
    yBottom,
  }));
}
