/**
 * Rapier world: colliders are built from the rendered table geometry
 * (plate with round holes, cushion pieces with nose and facets, pocket cups).
 * @see _docs/physics.md
 */
import * as THREE from "three";
import {
  createBallPhysics,
  trimeshDescFromGeometry,
} from "./physics-rapier.js";
import { pocketCupDims } from "./pocket-spec.js";
import {
  CUE_TIP_RADIUS,
  CUE_FERRULE_RADIUS,
  CUE_TIP_LENGTH,
  CUE_FERRULE_LENGTH,
} from "./cue-model.js";
import {
  PHYSICS_STEP,
  CUSHION_RESTITUTION,
  CUSHION_FRICTION,
  CONTACT_SKIN_M,
  TABLE_RESTITUTION,
  TABLE_FRICTION,
  CUP_RESTITUTION,
  CUP_FRICTION,
  CUE_TIP_CURVATURE_RADIUS,
  CUE_TIP_FRICTION,
  CUE_TIP_RESTITUTION,
  GROUP_STATIC,
  GROUP_CUE,
} from "./physics-constants.js";

/**
 * Convex hull of the cue's front end in the cue's local frame (origin = tip apex, +z towards the
 * butt): a dome with the tip's radius of curvature, the rubber tip and the ferrule.
 * @param {import("@dimforge/rapier3d-simd").default} RAPIER
 */
function cueTipColliderDesc(RAPIER) {
  const segments = 16;
  const points = [0, 0, 0]; // apex of the dome
  const ring = (radius, z) => {
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      points.push(Math.cos(a) * radius, Math.sin(a) * radius, z);
    }
  };
  const Rc = CUE_TIP_CURVATURE_RADIUS;
  for (let k = 1; k <= 4; k++) {
    const r = (CUE_TIP_RADIUS * k) / 4;
    ring(r, Rc - Math.sqrt(Rc * Rc - r * r)); // sphere of radius Rc, clipped at the tip radius
  }
  ring(CUE_TIP_RADIUS, CUE_TIP_LENGTH);
  ring(CUE_FERRULE_RADIUS, CUE_TIP_LENGTH);
  ring(CUE_FERRULE_RADIUS, CUE_TIP_LENGTH + CUE_FERRULE_LENGTH);
  return RAPIER.ColliderDesc.convexHull(new Float32Array(points));
}

/**
 * @param {import("@dimforge/rapier3d-simd").default} RAPIER
 * @param {{
 *   table: import("three").BufferGeometry;
 *   rubber: import("three").BufferGeometry[];
 * }} colliderGeometries — from buildAuthenticTableWithHoles
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

  // Playing plate + wood (hole edges included)
  world.createCollider(
    trimeshDescFromGeometry(RAPIER, colliderGeometries.table)
      .setRestitution(TABLE_RESTITUTION)
      .setRestitutionCombineRule(Multiply)
      .setFriction(TABLE_FRICTION)
      .setFrictionCombineRule(Average)
      .setCollisionGroups(GROUP_STATIC)
  );

  // Cushion rubber (nose + facets)
  for (const geo of colliderGeometries.rubber) {
    world.createCollider(
      trimeshDescFromGeometry(RAPIER, geo)
        .setRestitution(CUSHION_RESTITUTION)
        .setRestitutionCombineRule(Multiply)
        .setFriction(CUSHION_FRICTION)
        .setFrictionCombineRule(Average)
        .setContactSkin(CONTACT_SKIN_M)
        .setCollisionGroups(GROUP_STATIC)
    );
  }

  // Pocket cup: wall (open at the top) + floor; only the floor reports collisions → "pocketed"
  /** @type {Map<number, string>} floor collider handle → pocket id */
  const cupFloors = new Map();
  for (const spec of pocketSpecs) {
    const c = pocketCupDims(spec, tableH, feltDepth);

    const wallGeo = new THREE.CylinderGeometry(c.rTop, c.rBottom, c.height, 48, 1, true);
    wallGeo.translate(c.cx, c.yBottom + c.height / 2, c.cz);
    world.createCollider(
      trimeshDescFromGeometry(RAPIER, wallGeo)
        .setRestitution(CUP_RESTITUTION)
        .setFriction(CUP_FRICTION)
        .setCollisionGroups(GROUP_STATIC)
    );
    wallGeo.dispose();

    const floor = world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.005, c.rBottom)
        .setTranslation(c.cx, c.yBottom - 0.005, c.cz)
        .setRestitution(CUP_RESTITUTION)
        .setFriction(CUP_FRICTION)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setCollisionGroups(GROUP_STATIC)
    );
    cupFloors.set(floor.handle, spec.id);
  }

  // Safety floor far below (stray balls)
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(5, 0.05, 5)
      .setTranslation(0, 0.3, 0)
      .setCollisionGroups(GROUP_STATIC)
  );

  // The cue tip as a kinematic body: its real shape (dome, tip, ferrule) decides the contact
  const cueBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -10, 0)
  );
  const cueCollider = world.createCollider(
    cueTipColliderDesc(RAPIER)
      .setRestitution(CUE_TIP_RESTITUTION)
      .setRestitutionCombineRule(Multiply)
      .setFriction(CUE_TIP_FRICTION)
      .setFrictionCombineRule(Average)
      .setCollisionGroups(GROUP_CUE)
      .setEnabled(false), // only active during the forward stroke
    cueBody
  );

  return {
    world,
    eventQueue,
    cupFloors,
    cue: { body: cueBody, collider: cueCollider },
    /** @returns {{ body: import("@dimforge/rapier3d-simd").RigidBody; collider: import("@dimforge/rapier3d-simd").Collider }} */
    addBall(position, radius) {
      return createBallPhysics(RAPIER, world, position, radius);
    },
    removeBall(body) {
      world.removeRigidBody(body);
    },
  };
}
