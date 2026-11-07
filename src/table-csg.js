import * as THREE from "three";
import { Evaluator, SUBTRACTION, ADDITION } from "three-bvh-csg";
import { Brush } from "./csg-brush.js";

/** Round holes: enough segments for the edge to look round */
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
 * Unites meshes via CSG and subtracts the pocket cylinders.
 *
 * @param {import("three").Mesh[]} partMeshes — felt, cushions, wood (world transform applied)
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
