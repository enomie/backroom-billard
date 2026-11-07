import * as THREE from "three";
import {
  buildTableWithPocketsCSG,
  meshWithPocketHolesCSG,
} from "./table-csg.js";
import {
  CUSHION_PROFILE_BOTTOM_OUTSET,
  CUSHION_PROFILE_TOP_INSET,
} from "./table-constants.js";

/**
 * K-66-Näherung: Querschnitt als Trapez (unten außen, oben nach innen).
 *
 * @param {number} feltEdge — Filzkante auf dieser Achse (X oder Z)
 * @param {number} inwardSign — +1 / −1 Richtung Spielfeld
 * @param {number} rubberThick
 * @param {number} railH
 * @param {number} tableH
 */
function buildCushionProfile(feltEdge, inwardSign, rubberThick, railH, tableH) {
  const outwardSign = -inwardSign;
  const nose = feltEdge + inwardSign * rubberThick;
  const edgeBottom = feltEdge + outwardSign * CUSHION_PROFILE_BOTTOM_OUTSET;
  const edgeTopOuter =
    feltEdge + inwardSign * Math.max(rubberThick * 0.28, 0.008);
  const edgeTopInner =
    feltEdge + inwardSign * (rubberThick - CUSHION_PROFILE_TOP_INSET);

  return {
    yBottom: tableH,
    yTop: tableH + railH,
    edgeBottom,
    nose,
    edgeTopInner,
    edgeTopOuter,
  };
}

/**
 * @param {ReturnType<typeof buildCushionProfile>} profile
 * @param {number} length — Extrusionslänge entlang der Bahn
 * @param {"x" | "z"} along
 * @returns {THREE.BufferGeometry}
 */
function cushionExtrudeGeometry(profile, length, along) {
  const shape = new THREE.Shape();
  shape.moveTo(profile.edgeBottom, profile.yBottom);
  shape.lineTo(profile.nose, profile.yBottom);
  shape.lineTo(profile.edgeTopInner, profile.yTop);
  shape.lineTo(profile.edgeTopOuter, profile.yTop);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -length / 2);
  if (along === "x") {
    geo.rotateY(-Math.PI / 2);
  }
  return geo;
}

/**
 * Billiardtisch: Filz, 4× Bande, 4× Holz; optional CSG-Taschen aus `pocketSpecs`.
 *
 * @param {THREE.Scene} scene
 * @param {{
 *   playL: number;
 *   playW: number;
 *   tableH: number;
 *   railH: number;
 *   rubberThick: number;
 *   railThick: number;
 *   feltDepth: number;
 * }} dims
 * @param {Array<{ x: number; z: number; radius: number; isSide: boolean }>} pockets
 * @param {Array<{ x1: number; z1: number; x2: number; z2: number; nx: number; nz: number }>} cushions
 * @param {{ pocketSpecs?: ReturnType<import("./pocket-spec.js").createPocketSpecs> }} [options]
 */
export function buildAuthenticTableWithHoles(
  scene,
  dims,
  pockets,
  cushions,
  options = {}
) {
  const PLAY_L = dims.playL;
  const PLAY_W = dims.playW;
  const TABLE_H = dims.tableH;

  pockets.length = 0;
  cushions.length = 0;

  const hw = PLAY_W / 2;
  const hl = PLAY_L / 2;

  const feltShape = new THREE.Shape();
  feltShape.moveTo(-hw, -hl);
  feltShape.lineTo(hw, -hl);
  feltShape.lineTo(hw, hl);
  feltShape.lineTo(-hw, hl);
  feltShape.closePath();

  const feltDepth = dims.feltDepth;
  const extrudeSettings = { depth: feltDepth, bevelEnabled: false };
  const bedGeo = new THREE.ExtrudeGeometry(feltShape, extrudeSettings);
  bedGeo.rotateX(Math.PI / 2);
  bedGeo.translate(0, TABLE_H, 0);

  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x0a4032,
    roughness: 0.9,
    metalness: 0.01,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x1f0c05,
    roughness: 0.25,
    metalness: 0.12,
  });
  const cushionRubberMat = new THREE.MeshStandardMaterial({
    color: 0x08382b,
    roughness: 0.85,
  });
  const pocketLinerMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.05,
  });

  const railH = dims.railH;
  const railThick = dims.railThick;
  const rubberThick = dims.rubberThick;
  const railY = TABLE_H + railH / 2;
  const woodRailH = railH + 0.01;

  /** @type {THREE.Mesh[]} */
  const csgBaseMeshes = [];
  /** @type {THREE.Mesh[]} */
  const cushionMeshes = [];

  const bedMesh = new THREE.Mesh(bedGeo, feltMat);
  bedMesh.receiveShadow = true;
  csgBaseMeshes.push(bedMesh);

  /**
   * Bande an Filzkante: Gummi ins Feld, Holz nach außen (150 mm Cap gesamt).
   * @param {number} feltEdgeZ — äußere Filzkante (±hl)
   * @param {number} inwardNz — Normale ins Spielfeld (+1 / −1)
   */
  function addRailAlongX(feltEdgeZ, inwardNz) {
    const x1 = -hw;
    const x2 = hw;
    const outwardZ = -inwardNz;
    const noseZ = feltEdgeZ + inwardNz * rubberThick;
    cushions.push({ x1, z1: noseZ, x2, z2: noseZ, nx: 0, nz: inwardNz });

    const profile = buildCushionProfile(
      feltEdgeZ,
      inwardNz,
      rubberThick,
      railH,
      TABLE_H
    );
    const rubber = new THREE.Mesh(
      cushionExtrudeGeometry(profile, PLAY_W, "x"),
      cushionRubberMat
    );
    rubber.position.set(0, 0, 0);
    rubber.castShadow = true;
    cushionMeshes.push(rubber);

    const woodZ = feltEdgeZ + (outwardZ * railThick) / 2;
    const woodRail = new THREE.Mesh(
      new THREE.BoxGeometry(PLAY_W, woodRailH, railThick),
      woodMat
    );
    woodRail.position.set(0, railY + 0.005, woodZ);
    woodRail.castShadow = true;
    csgBaseMeshes.push(woodRail);
  }

  /**
   * @param {number} feltEdgeX — äußere Filzkante (±hw)
   * @param {number} inwardNx
   */
  function addRailAlongZ(feltEdgeX, inwardNx) {
    const z1 = -hl;
    const z2 = hl;
    const outwardX = -inwardNx;
    const noseX = feltEdgeX + inwardNx * rubberThick;
    cushions.push({ x1: noseX, z1, x2: noseX, z2, nx: inwardNx, nz: 0 });

    const profile = buildCushionProfile(
      feltEdgeX,
      inwardNx,
      rubberThick,
      railH,
      TABLE_H
    );
    const rubber = new THREE.Mesh(
      cushionExtrudeGeometry(profile, PLAY_L, "z"),
      cushionRubberMat
    );
    rubber.position.set(0, 0, 0);
    rubber.castShadow = true;
    cushionMeshes.push(rubber);

    const woodX = feltEdgeX + (outwardX * railThick) / 2;
    const woodRail = new THREE.Mesh(
      new THREE.BoxGeometry(railThick, woodRailH, PLAY_L),
      woodMat
    );
    woodRail.position.set(woodX, railY + 0.005, 0);
    woodRail.castShadow = true;
    csgBaseMeshes.push(woodRail);
  }

  addRailAlongX(-hl, 1);
  addRailAlongX(hl, -1);
  addRailAlongZ(-hw, 1);
  addRailAlongZ(hw, -1);

  const pocketSpecs = options.pocketSpecs;
  if (pocketSpecs && pocketSpecs.length > 0) {
    csgBaseMeshes.forEach((m) => m.updateMatrixWorld(true));
    const tableMesh = buildTableWithPocketsCSG(
      csgBaseMeshes,
      pocketSpecs,
      pocketLinerMat
    );
    scene.add(tableMesh);
    for (const m of csgBaseMeshes) {
      m.geometry.dispose();
    }

    for (const rubber of cushionMeshes) {
      scene.add(meshWithPocketHolesCSG(rubber, pocketSpecs, pocketLinerMat));
    }
  } else {
    for (const m of csgBaseMeshes) {
      scene.add(m);
    }
    for (const m of cushionMeshes) {
      scene.add(m);
    }
  }

  const outerInset = railThick;
  const legGeo = new THREE.CylinderGeometry(0.075, 0.055, TABLE_H, 16);
  [
    [-hw - outerInset - 0.03, TABLE_H / 2, -hl - outerInset - 0.03],
    [hw + outerInset + 0.03, TABLE_H / 2, -hl - outerInset - 0.03],
    [-hw - outerInset - 0.03, TABLE_H / 2, hl + outerInset + 0.03],
    [hw + outerInset + 0.03, TABLE_H / 2, hl + outerInset + 0.03],
  ].forEach((pos) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(pos[0], pos[1], pos[2]);
    leg.castShadow = true;
    scene.add(leg);
  });
}

window.BilliardTableBlueprint = {
  buildAuthenticTableWithHoles,
};
