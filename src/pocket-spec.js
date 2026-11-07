/**
 * pocket-spec.js — single source of truth for the table pockets (CSG & physics)
 */
import {
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

export const POCKET_DIM_DEFAULTS = {
  r_corner: POCKET_R_CORNER,
  r_side: POCKET_R_SIDE,
  cornerOffsetFactor: POCKET_CORNER_OFFSET_FACTOR,
  sideOffsetFactor: POCKET_SIDE_OFFSET_FACTOR,
  overhangTop: POCKET_OVERHANG_TOP,
  depthBottom: POCKET_DEPTH_BOTTOM,
};

/**
 * Nose tips of the cushions at the pockets (distance from the nose-line corner or from the center).
 * The back of the rubber ends at the round hole (`r` from the hole center on the felt edge),
 * the nose is cut back by `k · rubber width` (facet).
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
 * @param {number} table.playW — WPA playing field width (1.27 m)
 * @param {number} table.playL — WPA playing field length (2.54 m)
 * @param {number} table.tableH — felt surface Y
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
  // playW/playL = nose to nose; the round holes are centered on the felt edge
  const hw = table.playW / 2 + CUSHION_PROFILE_WIDTH; // Filzkante (Lochmitte liegt darauf)
  const hl = table.playL / 2 + CUSHION_PROFILE_WIDTH;

  const yTop = table.tableH + table.cushionH + dims.overhangTop;
  const yBottom = table.tableH - dims.depthBottom;
  const height = yTop - yBottom;
  const yCenter = (yTop + yBottom) / 2;

  /** Optional outward offset of the hole center (0 = exactly on the felt edge). */
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
