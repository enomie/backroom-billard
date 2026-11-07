import * as THREE from "three";
import { buildTableWithPocketsCSG } from "./table-csg.js";
import { cushionTipOffsets, pocketCupDims } from "./pocket-spec.js";
import {
  CUSHION_PROFILE_BOTTOM_OUTSET,
  CUSHION_PROFILE_FACE_RECESS,
  CUSHION_END_RECESS_CORNER,
  CUSHION_END_RECESS_SIDE,
} from "./table-constants.js";

/**
 * K-66-Näherung: Querschnitt als Trapez mit Nase OBEN (63,5 % Kugeldurchmesser);
 * die Gummifläche weicht nach unten zum Tuch zurück.
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
  // Rückseite senkrecht und bündig an der Holzwand (leicht ins Holz), kein Spalt
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
 * Bandenstück mit Facetten an den Enden: Die Rückseite (Filzkante) reicht bis ans runde Loch,
 * die Nase ist zurückgeschnitten (Endfläche weicht zur Nase hin vom Loch weg).
 *
 * @param {ReturnType<typeof buildCushionProfile>} profile
 * @param {"x" | "z"} along — Verlaufsrichtung der Bande in der Welt
 * @param {number} inwardSign — +1 / −1 Richtung Spielfeld (quer zur Bande)
 * @param {number} sStart — Weltkoordinate des unteren Endes an der Gummi-RÜCKSEITE (Filzkante)
 * @param {number} sEnd — Weltkoordinate des oberen Endes an der Rückseite
 * @param {number} kStart — Rücksprung der Endfläche pro Meter Gummitiefe Richtung Nase (unten)
 * @param {number} kEnd — dito (oberes Ende)
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
    // Tiefe ab Filzkante Richtung Nase (hinter der Filzkante: Rückseite bleibt bündig)
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

  // PLAY_W/PLAY_L gelten Nase zu Nase (WPA); der Filz reicht um die Gummibreite weiter nach außen.
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

  /** Welt-Geometrien für die Physik (Rapier-Trimesh) — exakt das, was gerendert wird. */
  const colliderGeometries = { table: null, rubber: [] };

  const bedMesh = new THREE.Mesh(bedGeo, feltMat);
  bedMesh.receiveShadow = true;
  csgBaseMeshes.push(bedMesh);

  /**
   * Bande an Filzkante: Gummi ins Feld, Holz nach außen (150 mm Cap gesamt).
   * @param {number} feltEdgeZ — äußere Filzkante (±hl)
   * @param {number} inwardNz — Normale ins Spielfeld (+1 / −1)
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
      new THREE.BoxGeometry(2 * (hw + railThick), woodRailH, railThick),
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
    const outwardX = -inwardNx;
    // Lange Bande: zwei Teilstücke zwischen Seitentasche und Ecktaschen-Spitze
    const zEnd = hlNose - cornerTip;
    const profile = buildCushionProfile(
      feltEdgeX,
      inwardNx,
      rubberThick,
      railH,
      TABLE_H
    );
    // Rückseiten-Enden (Filzkante) = Nasen-Ende + Rücksprung · Gummibreite
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
      new THREE.BoxGeometry(railThick, woodRailH, 2 * hl),
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

    // Banden enden an den Spitzen selbst (keine CSG nötig)
    for (const rubber of cushionMeshes) {
      scene.add(rubber);
      colliderGeometries.rubber.push(rubber.geometry);
    }

    // Taschenbecher (rund) beginnt direkt unter der 5-mm-Spielplatte, steht nirgends über
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

  return colliderGeometries;
}

window.BilliardTableBlueprint = {
  buildAuthenticTableWithHoles,
};
