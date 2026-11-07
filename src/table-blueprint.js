import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { woodTexture, glossyWoodMaterial } from "./wood.js";
import { buildTableWithPocketsCSG } from "./table-csg.js";
import { cushionTipOffsets, pocketCupDims } from "./pocket-spec.js";
import {
  CUSHION_PROFILE_BOTTOM_OUTSET,
  CUSHION_PROFILE_FACE_RECESS,
  CUSHION_END_RECESS_CORNER,
  CUSHION_END_RECESS_SIDE,
  LEG_CUP_GAP,
  LEG_RADIUS_TOP,
  LEG_RADIUS_BOTTOM,
  SKIRT_THICKNESS,
  SKIRT_HEIGHT,
  RAIL_EDGE_RADIUS,
  DIAMOND_LENGTH,
  DIAMOND_WIDTH,
  DIAMOND_HEIGHT,
  DIAMONDS_PER_SPAN,
} from "./table-constants.js";

/**
 * K-66 approximation: trapezoid cross-section with the nose on TOP (63.5 % of the ball diameter);
 * the rubber face recedes downwards towards the cloth.
 *
 * @param {number} feltEdge — felt edge on this axis (X or Z)
 * @param {number} inwardSign — +1 / −1 towards the playing field
 * @param {number} rubberThick
 * @param {number} railH
 * @param {number} tableH
 */
function buildCushionProfile(feltEdge, inwardSign, rubberThick, railH, tableH) {
  const outwardSign = -inwardSign;
  const nose = feltEdge + inwardSign * rubberThick;
  const edgeBottom = feltEdge + outwardSign * CUSHION_PROFILE_BOTTOM_OUTSET;
  // Back side vertical and flush with the wooden wall (slightly into the wood), no gap
  const edgeTopOuter = edgeBottom;
  const foot =
    feltEdge + inwardSign * (rubberThick - CUSHION_PROFILE_FACE_RECESS);

  return {
    feltEdge,
    yBottom: tableH,
    yTop: tableH + railH,
    edgeBottom,
    foot,
    nose,
    edgeTopOuter,
  };
}

/**
 * Cushion piece with facets at the ends: the back side (felt edge) reaches the round hole,
 * the nose is cut back (the end face recedes from the hole towards the nose).
 *
 * @param {ReturnType<typeof buildCushionProfile>} profile
 * @param {"x" | "z"} along — direction the cushion runs in the world
 * @param {number} inwardSign — +1 / −1 towards the playing field (across the cushion)
 * @param {number} sStart — world coordinate of the lower end at the BACK of the rubber (felt edge)
 * @param {number} sEnd — world coordinate of the upper end at the back side
 * @param {number} kStart — recess of the end face per meter of rubber depth towards the nose (lower end)
 * @param {number} kEnd — same (upper end)
 * @returns {THREE.BufferGeometry}
 */
function cushionPieceGeometry(profile, along, inwardSign, sStart, sEnd, kStart, kEnd) {
  const shape = new THREE.Shape();
  shape.moveTo(profile.edgeBottom, profile.yBottom);
  shape.lineTo(profile.foot, profile.yBottom);
  shape.lineTo(profile.nose, profile.yTop);
  shape.lineTo(profile.edgeTopOuter, profile.yTop);
  shape.closePath();

  const depth = sEnd - sStart;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Depth from the felt edge towards the nose (behind the felt edge the back side stays flush)
    const d = Math.max(0, inwardSign * (u - profile.feltEdge));
    const s = z < depth / 2 ? sStart + kStart * d : sEnd - kEnd * d;
    if (along === "z") pos.setXYZ(i, u, y, s);
    else pos.setXYZ(i, s, y, u);
  }
  if (along === "x") {
    // Achsentausch spiegelt → Dreiecks-Umlaufsinn umdrehen
    for (let i = 0; i < pos.count; i += 3) {
      const x1 = pos.getX(i + 1), y1 = pos.getY(i + 1), z1 = pos.getZ(i + 1);
      pos.setXYZ(i + 1, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      pos.setXYZ(i + 2, x1, y1, z1);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Pool table: felt, 4× cushion, 4× wood; optional CSG pockets from `pocketSpecs`.
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
 * @param {{ pocketSpecs?: ReturnType<import("./pocket-spec.js").createPocketSpecs> }} [options]
 */
export function buildAuthenticTableWithHoles(
  scene,
  dims,
  options = {}
) {
  const PLAY_L = dims.playL;
  const PLAY_W = dims.playW;
  const TABLE_H = dims.tableH;

  // PLAY_W/PLAY_L are measured nose to nose (WPA); the felt extends outwards by the rubber width.
  const hw = PLAY_W / 2 + dims.rubberThick;
  const hl = PLAY_L / 2 + dims.rubberThick;

  const hwNose = PLAY_W / 2;
  const hlNose = PLAY_L / 2;
  const { cornerTip, sideTip } = cushionTipOffsets();

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
  // Varnished dark mahogany
  const woodMat = glossyWoodMaterial(
    woodTexture({ base: "#6a3018", light: "150,80,45", dark: "25,8,2" })
  );
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

  /** World geometries for the physics (Rapier trimesh) — exactly what is rendered. */
  const colliderGeometries = { table: null, rubber: [] };

  const bedMesh = new THREE.Mesh(bedGeo, feltMat);
  bedMesh.receiveShadow = true;
  csgBaseMeshes.push(bedMesh);

  /**
   * Cushion at the felt edge: rubber into the field, wood outwards (150 mm cap in total).
   * @param {number} feltEdgeZ — outer felt edge (±hl)
   * @param {number} inwardNz — normal pointing into the playing field (+1 / −1)
   */
  function addRailAlongX(feltEdgeZ, inwardNz) {
    const outwardZ = -inwardNz;
    const profile = buildCushionProfile(
      feltEdgeZ,
      inwardNz,
      rubberThick,
      railH,
      TABLE_H
    );
    const rubber = new THREE.Mesh(
      cushionPieceGeometry(
        profile,
        "x",
        inwardNz,
        -(hwNose - cornerTip + CUSHION_END_RECESS_CORNER * rubberThick),
        hwNose - cornerTip + CUSHION_END_RECESS_CORNER * rubberThick,
        CUSHION_END_RECESS_CORNER,
        CUSHION_END_RECESS_CORNER
      ),
      cushionRubberMat
    );
    rubber.castShadow = true;
    cushionMeshes.push(rubber);

    const woodZ = feltEdgeZ + (outwardZ * railThick) / 2;
    const woodRail = new THREE.Mesh(
      new RoundedBoxGeometry(2 * (hw + railThick), woodRailH, railThick, 4, RAIL_EDGE_RADIUS),
      woodMat
    );
    woodRail.position.set(0, railY + 0.005, woodZ);
    woodRail.castShadow = true;
    csgBaseMeshes.push(woodRail);
  }

  /**
   * @param {number} feltEdgeX — outer felt edge (±hw)
   * @param {number} inwardNx
   */
  function addRailAlongZ(feltEdgeX, inwardNx) {
    const outwardX = -inwardNx;
    // Long cushion: two pieces between the side pocket and the corner pocket tip
    const zEnd = hlNose - cornerTip;
    const profile = buildCushionProfile(
      feltEdgeX,
      inwardNx,
      rubberThick,
      railH,
      TABLE_H
    );
    // Back-side ends (felt edge) = nose end + recess · rubber width
    const sBack = sideTip - CUSHION_END_RECESS_SIDE * rubberThick;
    const zBack = zEnd + CUSHION_END_RECESS_CORNER * rubberThick;
    for (const [sa, sb, ka, kb] of [
      [sBack, zBack, CUSHION_END_RECESS_SIDE, CUSHION_END_RECESS_CORNER],
      [-zBack, -sBack, CUSHION_END_RECESS_CORNER, CUSHION_END_RECESS_SIDE],
    ]) {
      const rubber = new THREE.Mesh(
        cushionPieceGeometry(profile, "z", inwardNx, sa, sb, ka, kb),
        cushionRubberMat
      );
      rubber.castShadow = true;
      cushionMeshes.push(rubber);
    }

    const woodX = feltEdgeX + (outwardX * railThick) / 2;
    const woodRail = new THREE.Mesh(
      new RoundedBoxGeometry(railThick, woodRailH, 2 * hl, 4, RAIL_EDGE_RADIUS),
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
    colliderGeometries.table = tableMesh.geometry;
    for (const m of csgBaseMeshes) {
      m.geometry.dispose();
    }

    // Cushions end at their tips themselves (no CSG needed)
    for (const rubber of cushionMeshes) {
      scene.add(rubber);
      colliderGeometries.rubber.push(rubber.geometry);
    }

    // Round pocket cup starts directly below the 5 mm playing plate and does not protrude anywhere
    const cupMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.95,
      side: THREE.BackSide,
    });
    for (const spec of pocketSpecs) {
      const c = pocketCupDims(spec, TABLE_H, feltDepth);
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(c.rTop, c.rBottom, c.height, 48, 1, false),
        cupMat
      );
      cup.position.set(c.cx, c.yBottom + c.height / 2, c.cz);
      cup.name = `pocket-cup-${spec.id}`;
      scene.add(cup);
    }
  } else {
    for (const m of csgBaseMeshes) {
      scene.add(m);
    }
    for (const m of cushionMeshes) {
      scene.add(m);
    }
  }

  // Apron boards around the table: flush with the outer edge of the wooden frame, hanging down
  // from the frame's bottom edge (y = TABLE_H), so the pocket cups cannot be seen from outside
  const outerX = hw + railThick;
  const outerZ = hl + railThick;
  const skirtY = TABLE_H - SKIRT_HEIGHT / 2;
  const addSkirt = (sizeX, sizeZ, x, z) => {
    const board = new THREE.Mesh(new THREE.BoxGeometry(sizeX, SKIRT_HEIGHT, sizeZ), woodMat);
    board.position.set(x, skirtY, z);
    board.castShadow = true;
    board.receiveShadow = true;
    board.name = "table-skirt";
    scene.add(board);
  };
  // Long sides (along z) run the full length; short sides fit between them
  for (const sx of [-1, 1]) {
    addSkirt(SKIRT_THICKNESS, 2 * outerZ, sx * (outerX - SKIRT_THICKNESS / 2), 0);
  }
  for (const sz of [-1, 1]) {
    addSkirt(2 * (outerX - SKIRT_THICKNESS), SKIRT_THICKNESS, 0, sz * (outerZ - SKIRT_THICKNESS / 2));
  }

  // Diamonds: mother-of-pearl rhombi on top of the frame, dividing each span between two
  // neighbouring pockets evenly (long sides: corner–side–corner, short sides: corner–corner)
  const diamondShape = new THREE.Shape();
  diamondShape.moveTo(-DIAMOND_LENGTH / 2, 0);
  diamondShape.lineTo(0, DIAMOND_WIDTH / 2);
  diamondShape.lineTo(DIAMOND_LENGTH / 2, 0);
  diamondShape.lineTo(0, -DIAMOND_WIDTH / 2);
  diamondShape.closePath();
  const diamondGeo = new THREE.ExtrudeGeometry(diamondShape, {
    depth: DIAMOND_HEIGHT,
    bevelEnabled: true,
    bevelSize: 0.0006,
    bevelThickness: 0.0006,
    bevelSegments: 1,
  });
  diamondGeo.rotateX(-Math.PI / 2);
  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: 0xf3ece4,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    iridescence: 1,
    iridescenceIOR: 1.6,
    sheen: 1,
    sheenColor: new THREE.Color(0xd9e6ff),
  });
  const diamondTop = TABLE_H + railH + 0.01;
  const addDiamonds = (fixed, from, to, alongX) => {
    for (let i = 1; i <= DIAMONDS_PER_SPAN; i++) {
      const pos = from + ((to - from) * i) / (DIAMONDS_PER_SPAN + 1);
      const d = new THREE.Mesh(diamondGeo, pearlMat);
      d.position.set(alongX ? pos : fixed, diamondTop, alongX ? fixed : pos);
      if (!alongX) d.rotation.y = Math.PI / 2;
      d.name = "table-diamond";
      scene.add(d);
    }
  };
  for (const side of [-1, 1]) {
    const mid = side * (hw + railThick / 2); // middle of the frame width
    addDiamonds(mid, -hl, 0, false);
    addDiamonds(mid, 0, hl, false);
    addDiamonds(side * (hl + railThick / 2), -hw, hw, true);
  }

  // Legs: one below each corner pocket cup, from the floor up to LEG_CUP_GAP below the cup bottom
  const cornerCups = (pocketSpecs ?? []).filter((spec) => spec.id.startsWith("corner"));
  for (const spec of cornerCups) {
    const cup = pocketCupDims(spec, TABLE_H, feltDepth);
    const legHeight = cup.yBottom - LEG_CUP_GAP;
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(LEG_RADIUS_TOP, LEG_RADIUS_BOTTOM, legHeight, 24),
      woodMat
    );
    leg.position.set(cup.cx, legHeight / 2, cup.cz);
    leg.castShadow = true;
    leg.name = `table-leg-${spec.id}`;
    scene.add(leg);
  }

  return colliderGeometries;
}

window.BillardTableBlueprint = {
  buildAuthenticTableWithHoles,
};
