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
    .setCcdEnabled(true);

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
