import * as THREE from "three";
import { Evaluator, SUBTRACTION, ADDITION } from "three-bvh-csg";
import { Brush } from "./csg-brush.js";

/** Runde Löcher: genug Segmente, damit die Kante rund wirkt */
const POCKET_CYLINDER_SEGMENTS = 48;

/**
 * @param {import("three").Mesh} mesh
 * @returns {Brush}
 */
function meshToBrush(mesh) {
  const geom = mesh.geometry.clone();
  geom.applyMatrix4(mesh.matrixWorld);
  const brush = new Brush(geom, mesh.material);
  brush.position.set(0, 0, 0);
  brush.rotation.set(0, 0, 0);
  brush.scale.set(1, 1, 1);
  brush.updateMatrixWorld(true);
  return brush;
}

/**
 * @param {Brush} brush
 * @param {Array<{ center: [number, number, number]; radius: number; height: number }>} pocketSpecs
 * @param {import("three").Material} linerMaterial
 * @param {Evaluator} evaluator
 * @returns {Brush}
 */
function subtractPockets(brush, pocketSpecs, linerMaterial, evaluator) {
  let current = brush;
  for (const spec of pocketSpecs) {
    const cylinderGeom = new THREE.CylinderGeometry(
      spec.radius,
      spec.radius,
      spec.height,
      POCKET_CYLINDER_SEGMENTS,
      1,
      false
    );
    const pocketBrush = new Brush(cylinderGeom, linerMaterial);
    pocketBrush.position.set(spec.center[0], spec.center[1], spec.center[2]);
    pocketBrush.updateMatrixWorld(true);

    const prev = current;
    const target = new Brush();
    current = evaluator.evaluate(prev, pocketBrush, SUBTRACTION, target);
    prev.geometry.dispose();
    pocketBrush.geometry.dispose();
  }
  return current;
}

/**
 * Vereinigt Meshes per CSG und subtrahiert Taschen-Zylinder.
 *
 * @param {import("three").Mesh[]} partMeshes — Filz, Banden, Holz (Welttransform angewendet)
 * @param {Array<{
 *   id: string;
 *   center: [number, number, number];
 *   radius: number;
 *   height: number;
 * }>} pocketSpecs
 * @param {import("three").Material} linerMaterial
 * @returns {import("three").Mesh}
 */
export function buildTableWithPocketsCSG(partMeshes, pocketSpecs, linerMaterial) {
  const evaluator = new Evaluator();
  evaluator.useGroups = true;

  if (partMeshes.length === 0) {
    throw new Error("buildTableWithPocketsCSG: keine Tischteile");
  }

  partMeshes.forEach((m) => m.updateMatrixWorld(true));

  let currentTableBrush = meshToBrush(partMeshes[0]);
  for (let i = 1; i < partMeshes.length; i++) {
    const nextBrush = meshToBrush(partMeshes[i]);
    const prev = currentTableBrush;
    const target = new Brush();
    currentTableBrush = evaluator.evaluate(prev, nextBrush, ADDITION, target);
    prev.geometry.dispose();
    nextBrush.geometry.dispose();
  }

  currentTableBrush = subtractPockets(
    currentTableBrush,
    pocketSpecs,
    linerMaterial,
    evaluator
  );

  currentTableBrush.geometry.computeVertexNormals();

  const finalTableMesh = new THREE.Mesh(
    currentTableBrush.geometry,
    currentTableBrush.material
  );
  finalTableMesh.name = "table-csg-final";
  finalTableMesh.castShadow = true;
  finalTableMesh.receiveShadow = true;

  return finalTableMesh;
}

/**
 * Einzelnes Teil (z. B. Trapez-Bande): nur Taschen ausschneiden, kein Union.
 *
 * @param {import("three").Mesh} mesh
 * @param {Array<{ center: [number, number, number]; radius: number; height: number }>} pocketSpecs
 * @param {import("three").Material} linerMaterial
 * @returns {import("three").Mesh}
 */
export function meshWithPocketHolesCSG(mesh, pocketSpecs, linerMaterial) {
  mesh.updateMatrixWorld(true);
  const evaluator = new Evaluator();
  let brush = meshToBrush(mesh);
  mesh.geometry.dispose();

  brush = subtractPockets(brush, pocketSpecs, linerMaterial, evaluator);
  brush.geometry.computeVertexNormals();

  const out = new THREE.Mesh(brush.geometry, mesh.material);
  out.castShadow = true;
  out.receiveShadow = true;
  return out;
}
