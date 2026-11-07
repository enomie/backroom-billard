/**
 * Rapier collider factories (when window.RAPIER is available).
 * @see _docs/physics.md
 */
import {
  BALL_RESTITUTION,
  BALL_FRICTION,
  BALL_MASS_KG,
  LINEAR_DAMPING,
  ANGULAR_DAMPING,
  GROUP_BALL,
} from "./physics-constants.js";

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
    .setCanSleep(false); // the game controls the resting state itself (see stepPhysics)

  const body = world.createRigidBody(bodyDesc);

  const r = ballRadius ?? 0.028575;
  const colliderDesc = RAPIER.ColliderDesc.ball(r)
    .setMass(BALL_MASS_KG)
    .setRestitution(BALL_RESTITUTION)
    .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
    .setFriction(BALL_FRICTION)
    .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Average)
    .setCollisionGroups(GROUP_BALL)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS); // ball–ball / ball–cushion sounds

  const collider = world.createCollider(colliderDesc, body);

  return { body, collider };
}

/**
 * Triangle mesh collider built directly from a (world-space) geometry of the visuals.
 *
 * @param {import("@dimforge/rapier3d-simd").default} RAPIER
 * @param {import("three").BufferGeometry} geometry — world coordinates, possibly non-indexed
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
    // Fix internal edges (otherwise "ghost edges" deflect a rolling ball sideways),
    // two-sided because balls in the pocket cup hit the wall from the inside
    F.FIX_INTERNAL_EDGES_TWO_SIDED
  );
}
