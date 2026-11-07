/**
 * Rapier-Welt: Kollisionskörper werden aus der gerenderten Tisch-Geometrie gebaut
 * (Platte mit runden Löchern, Bandenstücke mit Nase und Facetten, Taschenbecher).
 * @see _docs/physics.md
 */
import * as THREE from "three";
import {
  createBallPhysics,
  trimeshDescFromGeometry,
} from "./physics-rapier.js";
import { pocketCupDims } from "./pocket-spec.js";
import {
  PHYSICS_STEP,
  CUSHION_RESTITUTION,
  CUSHION_FRICTION,
  CONTACT_SKIN_M,
  TABLE_RESTITUTION,
  TABLE_FRICTION,
  CUP_RESTITUTION,
  CUP_FRICTION,
} from "./physics-constants.js";

/**
 * @param {import("@dimforge/rapier3d-simd").default} RAPIER
 * @param {{
 *   table: import("three").BufferGeometry;
 *   rubber: import("three").BufferGeometry[];
 * }} colliderGeometries — aus buildAuthenticTableWithHoles
 * @param {Array<{ id: string; center: number[]; radius: number; yBottom: number }>} pocketSpecs
 * @param {number} tableH
 * @param {number} feltDepth
 */
export function createPhysicsWorld(RAPIER, colliderGeometries, pocketSpecs, tableH, feltDepth) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = PHYSICS_STEP;
  world.lengthUnit = 0.1;
  const eventQueue = new RAPIER.EventQueue(true);

  const Multiply = RAPIER.CoefficientCombineRule.Multiply;
  const Average = RAPIER.CoefficientCombineRule.Average;

  // Spielplatte + Holz (Loch-Kanten inklusive)
  world.createCollider(
    trimeshDescFromGeometry(RAPIER, colliderGeometries.table)
      .setRestitution(TABLE_RESTITUTION)
      .setRestitutionCombineRule(Multiply)
      .setFriction(TABLE_FRICTION)
      .setFrictionCombineRule(Average)
  );

  // Bandengummi (Nase + Facetten)
  for (const geo of colliderGeometries.rubber) {
    world.createCollider(
      trimeshDescFromGeometry(RAPIER, geo)
        .setRestitution(CUSHION_RESTITUTION)
        .setRestitutionCombineRule(Multiply)
        .setFriction(CUSHION_FRICTION)
        .setFrictionCombineRule(Average)
        .setContactSkin(CONTACT_SKIN_M)
    );
  }

  // Taschenbecher: Wand (oben offen) + Boden; nur der Boden meldet Kollisionen → "versenkt"
  /** @type {Map<number, string>} Collider-Handle des Bodens → Taschen-ID */
  const cupFloors = new Map();
  for (const spec of pocketSpecs) {
    const c = pocketCupDims(spec, tableH, feltDepth);

    const wallGeo = new THREE.CylinderGeometry(c.rTop, c.rBottom, c.height, 48, 1, true);
    wallGeo.translate(c.cx, c.yBottom + c.height / 2, c.cz);
    world.createCollider(
      trimeshDescFromGeometry(RAPIER, wallGeo)
        .setRestitution(CUP_RESTITUTION)
        .setFriction(CUP_FRICTION)
    );
    wallGeo.dispose();

    const floor = world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.005, c.rBottom)
        .setTranslation(c.cx, c.yBottom - 0.005, c.cz)
        .setRestitution(CUP_RESTITUTION)
        .setFriction(CUP_FRICTION)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
    );
    cupFloors.set(floor.handle, spec.id);
  }

  // Sicherheitsboden weit unten (Streuner)
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(5, 0.05, 5).setTranslation(0, 0.3, 0)
  );

  return {
    world,
    eventQueue,
    cupFloors,
    /** @returns {{ body: import("@dimforge/rapier3d-simd").RigidBody; collider: import("@dimforge/rapier3d-simd").Collider }} */
    addBall(position, radius) {
      return createBallPhysics(RAPIER, world, position, radius);
    },
    removeBall(body) {
      world.removeRigidBody(body);
    },
  };
}
