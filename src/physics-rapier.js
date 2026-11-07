/**
 * Rapier-Collider-Fabriken (wenn window.RAPIER verfügbar).
 * @see _docs/physics.md
 */
import {
  CUSHION_RESTITUTION,
  CUSHION_FRICTION,
  BALL_RESTITUTION,
  BALL_FRICTION,
  BALL_MASS_KG,
  LINEAR_DAMPING,
  ANGULAR_DAMPING,
  CONTACT_SKIN_M,
} from "./physics-constants.js";

/**
 * @param {import("@dimforge/rapier3d-simd").default} RAPIER
 * @param {{ x: number; y: number; z: number }} halfExtents
 */
export function createCushionColliderDesc(RAPIER, halfExtents) {
  return RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
    .setRestitution(CUSHION_RESTITUTION)
    .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
    .setFriction(CUSHION_FRICTION)
    .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Average)
    .setContactSkin(CONTACT_SKIN_M);
}

/**
 * @param {import("@dimforge/rapier3d-simd").default} RAPIER
 * @param {import("@dimforge/rapier3d-simd").World} world
 * @param {{ x: number; y: number; z: number }} position
 * @param {number} [ballRadius]
 */
export function createBallPhysics(RAPIER, world, position, ballRadius) {
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(position.x, position.y, position.z)
    .setLinearDamping(LINEAR_DAMPING)
    .setAngularDamping(ANGULAR_DAMPING)
    .setCcdEnabled(true)
    .setCanSleep(false); // Ruhezustand steuert das Spiel selbst (siehe stepPhysics)

  const body = world.createRigidBody(bodyDesc);

  const r = ballRadius ?? 0.028575;
  const colliderDesc = RAPIER.ColliderDesc.ball(r)
    .setMass(BALL_MASS_KG)
    .setRestitution(BALL_RESTITUTION)
    .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
    .setFriction(BALL_FRICTION)
    .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Average);

  const collider = world.createCollider(colliderDesc, body);

  return { body, collider };
}

/**
 * Dreiecksnetz-Collider direkt aus einer (Welt-)Geometrie des Visuellen.
 *
 * @param {import("@dimforge/rapier3d-simd").default} RAPIER
 * @param {import("three").BufferGeometry} geometry — Welt-Koordinaten, ggf. nicht indiziert
 */
export function trimeshDescFromGeometry(RAPIER, geometry) {
  const pos = geometry.attributes.position;
  const vertices = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    vertices[i * 3] = pos.getX(i);
    vertices[i * 3 + 1] = pos.getY(i);
    vertices[i * 3 + 2] = pos.getZ(i);
  }
  let indices;
  if (geometry.index) {
    indices = Uint32Array.from(geometry.index.array);
  } else {
    indices = new Uint32Array(pos.count);
    for (let i = 0; i < pos.count; i++) indices[i] = i;
  }
  const F = RAPIER.TriMeshFlags;
  return RAPIER.ColliderDesc.trimesh(
    vertices,
    indices,
    // Innenkanten korrigieren (sonst „Geisterkanten“: rollende Kugel wird seitlich abgelenkt),
    // beidseitig, weil Kugeln im Taschenbecher die Wand von innen treffen
    F.FIX_INTERNAL_EDGES_TWO_SIDED
  );
}
