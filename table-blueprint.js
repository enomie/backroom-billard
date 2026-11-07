/**
 * Billiardtisch-Bauplan: Filz mit Löchern, Taschen, Banden, Beine.
 * Erwartet globales THREE (CDN). Mutiert `pockets` und `cushions` für die Physik.
 *
 * @param {import("three").Scene} scene
 * @param {{ playL: number; playW: number; tableH: number; pocketR: number }} dims
 * @param {Array<{ x: number; z: number; radius: number; isSide: boolean }>} pockets
 * @param {Array<{ x1: number; z1: number; x2: number; z2: number; nx: number; nz: number }>} cushions
 */
function buildAuthenticTableWithHoles(scene, dims, pockets, cushions) {
  "use strict";

  const PLAY_L = dims.playL;
  const PLAY_W = dims.playW;
  const TABLE_H = dims.tableH;
  const POCKET_R = dims.pocketR;

  pockets.length = 0;
  cushions.length = 0;

  const hw = PLAY_W / 2;
  const hl = PLAY_L / 2;

  // Definierte Taschen-Mittelpunkte (4 Ecken, 2 Mitten)
  const pocketCoords = [
    { x: -hw + 0.015, z: -hl + 0.015, isSide: false }, // Oben Links
    { x: hw - 0.015, z: -hl + 0.015, isSide: false }, // Oben Rechts
    { x: -hw - 0.008, z: 0, isSide: true }, // Mitte Links
    { x: hw + 0.008, z: 0, isSide: true }, // Mitte Rechts
    { x: -hw + 0.015, z: hl - 0.015, isSide: false }, // Unten Links
    { x: hw - 0.015, z: hl - 0.015, isSide: false }, // Unten Rechts
  ];

  // Filz-Tischplatte mit 6 Löchern (Shape mit Loch-Pfaden ausgestanzt)
  const feltShape = new THREE.Shape();
  feltShape.moveTo(-hw, -hl);
  feltShape.lineTo(hw, -hl);
  feltShape.lineTo(hw, hl);
  feltShape.lineTo(-hw, hl);
  feltShape.closePath();

  pocketCoords.forEach((p) => {
    const holePath = new THREE.Path();
    const r = p.isSide ? POCKET_R * 0.95 : POCKET_R;
    holePath.absarc(p.x, p.z, r, 0, Math.PI * 2, true);
    feltShape.holes.push(holePath);

    pockets.push({
      x: p.x,
      z: p.z,
      radius: r,
      isSide: p.isSide,
    });
  });

  const extrudeSettings = { depth: 0.045, bevelEnabled: false };
  const bedGeo = new THREE.ExtrudeGeometry(feltShape, extrudeSettings);
  bedGeo.rotateX(Math.PI / 2);
  bedGeo.translate(0, TABLE_H, 0);

  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x0a4032,
    roughness: 0.9,
    metalness: 0.01,
  });
  const bedMesh = new THREE.Mesh(bedGeo, feltMat);
  bedMesh.receiveShadow = true;
  scene.add(bedMesh);

  const pocketCupMat = new THREE.MeshStandardMaterial({
    color: 0x080808,
    roughness: 0.95,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xb58b38,
    metalness: 0.8,
    roughness: 0.3,
  });

  pockets.forEach((p) => {
    const cupGeo = new THREE.CylinderGeometry(
      p.radius,
      p.radius * 0.75,
      0.16,
      24,
      1,
      true
    );
    const cup = new THREE.Mesh(cupGeo, pocketCupMat);
    cup.position.set(p.x, TABLE_H - 0.08, p.z);
    scene.add(cup);

    const cupBottom = new THREE.Mesh(
      new THREE.CircleGeometry(p.radius * 0.75, 24),
      pocketCupMat
    );
    cupBottom.rotation.x = -Math.PI / 2;
    cupBottom.position.set(p.x, TABLE_H - 0.16, p.z);
    scene.add(cupBottom);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(p.radius, 0.012, 12, 24),
      rimMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(p.x, TABLE_H + 0.002, p.z);
    scene.add(ring);
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

  const railH = 0.055;
  const railThick = 0.12;

  /**
   * @param {number} x1
   * @param {number} z1
   * @param {number} x2
   * @param {number} z2
   * @param {number} normalX
   * @param {number} normalZ
   */
  function createCushionSegment(x1, z1, x2, z2, normalX, normalZ) {
    cushions.push({ x1, z1, x2, z2, nx: normalX, nz: normalZ });

    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const group = new THREE.Group();
    group.position.set((x1 + x2) / 2, TABLE_H + railH / 2, (z1 + z2) / 2);
    group.rotation.y = angle;

    const rubber = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, railH, len),
      cushionRubberMat
    );
    rubber.castShadow = true;
    group.add(rubber);

    const woodRail = new THREE.Mesh(
      new THREE.BoxGeometry(railThick, railH + 0.01, len + 0.03),
      woodMat
    );
    woodRail.position.set(
      -normalX * (railThick / 2 + 0.01),
      0.005,
      -normalZ * (railThick / 2 + 0.01)
    );
    woodRail.castShadow = true;
    group.add(woodRail);

    scene.add(group);
  }

  const cornerOffset = 0.105;
  const sideOffset = 0.075;

  createCushionSegment(-hw + cornerOffset, -hl, hw - cornerOffset, -hl, 0, 1);
  createCushionSegment(-hw + cornerOffset, hl, hw - cornerOffset, hl, 0, -1);
  createCushionSegment(-hw, -hl + cornerOffset, -hw, -sideOffset, 1, 0);
  createCushionSegment(-hw, sideOffset, -hw, hl - cornerOffset, 1, 0);
  createCushionSegment(hw, -hl + cornerOffset, hw, -sideOffset, -1, 0);
  createCushionSegment(hw, sideOffset, hw, hl - cornerOffset, -1, 0);

  const legGeo = new THREE.CylinderGeometry(0.075, 0.055, TABLE_H, 16);
  [
    [-hw - 0.04, TABLE_H / 2, -hl - 0.04],
    [hw + 0.04, TABLE_H / 2, -hl - 0.04],
    [-hw - 0.04, TABLE_H / 2, hl + 0.04],
    [hw + 0.04, TABLE_H / 2, hl + 0.04],
  ].forEach((pos) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(pos[0], pos[1], pos[2]);
    leg.castShadow = true;
    scene.add(leg);
  });
}

/** @type {{ buildAuthenticTableWithHoles: typeof buildAuthenticTableWithHoles }} */
window.BilliardTableBlueprint = {
  buildAuthenticTableWithHoles,
};
