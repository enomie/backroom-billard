/**
 * What Rapier does not do by itself for the balls on the cloth (see _docs/physics.md): cloth drag, swerve,
 * the limit of the squirt after an off-center hit, and a safety net for a hit that did not move the ball.
 * The ball objects are those of billard.js ({ body, inPocket, ... }).
 */
import { TABLE_H, BALL_RADIUS_REAL as BALL_R } from "./table-constants.js";
import {
  GRAVITY,
  CUE_SQUIRT_MAX_DEG,
  SWERVE_BOOST,
  SWERVE_SECONDS,
  TABLE_FRICTION,
  BALL_FRICTION,
  ROLLING_RESISTANCE,
  SIDE_SPIN_DECEL,
} from "./physics-constants.js";

/** A ball is on the cloth (not dropping into a pocket or off the table). */
const onCloth = (b) => !b.inPocket && b.body.translation().y >= TABLE_H - 0.01;

/** The angle in (−π, π]. */
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * After a hit off center: pull the ball's direction back toward the aim line (see CUE_SQUIRT_MAX_DEG).
 * Speed and spin stay; the horizontal part of the spin turns with the direction so that the ball
 * still rolls consistently.
 * @param {{ aimAngle: number, x: number }} stroke — the aim and the sideways strike offset (−1 … 1)
 */
export function limitSquirt(cueBall, stroke) {
  const v = cueBall.body.linvel();
  const speed = Math.hypot(v.x, v.z);
  if (speed < 0.1) return;
  const heading = Math.atan2(v.x, -v.z); // 0 = along −z
  const wanted = -stroke.aimAngle - stroke.x * ((CUE_SQUIRT_MAX_DEG * Math.PI) / 180);
  const psi = -wrapAngle(wanted - heading); // the rotation about the vertical axis that gets it there
  const [c, sn] = [Math.cos(psi), Math.sin(psi)];
  const w = cueBall.body.angvel();
  cueBall.body.setLinvel({ x: v.x * c + v.z * sn, y: v.y, z: -v.x * sn + v.z * c }, true);
  cueBall.body.setAngvel({ x: w.x * c + w.z * sn, y: w.y, z: -w.x * sn + w.z * c }, true);
}

/**
 * Swerve (see SWERVE_BOOST): while the white ball slides on the cloth the friction pulls against the
 * slip of the contact point; its part across the ball's direction is what bends the path. It is
 * multiplied here, in the first seconds after the hit.
 */
export function createSwerve() {
  let time = SWERVE_SECONDS; // seconds since the hit
  return {
    /** The tip has hit the white ball. */
    hit() {
      time = 0;
    },
    /** @param {number} dt — physics step (s) */
    apply(cueBall, dt) {
      time += dt;
      if (SWERVE_BOOST <= 1 || time > SWERVE_SECONDS || !cueBall || !onCloth(cueBall)) return;
      const v = cueBall.body.linvel();
      const w = cueBall.body.angvel();
      const speed = Math.hypot(v.x, v.z);
      // speed of the contact point on the cloth (the point below the center): 0 = rolling, no slip
      const ux = v.x + BALL_R * w.z;
      const uz = v.z - BALL_R * w.x;
      const slip = Math.hypot(ux, uz);
      if (speed < 0.05 || slip < 0.02) return;
      const [hx, hz] = [v.x / speed, v.z / speed];
      const along = (ux * hx + uz * hz) / slip;
      const [sideX, sideZ] = [ux / slip - along * hx, uz / slip - along * hz]; // slip direction across the path
      const k = (SWERVE_BOOST - 1) * ((TABLE_FRICTION + BALL_FRICTION) / 2) * GRAVITY * cueBall.body.mass() * dt;
      cueBall.body.applyImpulse({ x: -sideX * k, y: 0, z: -sideZ * k }, true); // friction acts against the slip
    },
  };
}

/**
 * Cloth drag (see ROLLING_RESISTANCE, SIDE_SPIN_DECEL): a constant deceleration of every ball on the
 * table. The horizontal spin changes with the speed so that the slip of the contact point stays as it
 * is (a rolling ball keeps rolling); the spin about the vertical axis decays towards 0.
 * @param {number} dt — physics step (s)
 */
export function applyClothDrag(balls, dt) {
  const dv = ROLLING_RESISTANCE * GRAVITY * dt;
  const dw = SIDE_SPIN_DECEL * dt;
  for (const b of balls) {
    if (!onCloth(b)) continue;
    const v = b.body.linvel();
    const w = b.body.angvel();
    const speed = Math.hypot(v.x, v.z);
    const f = speed > dv ? dv / speed : 1; // part of the speed that is taken away
    const [ax, az] = [v.x * f, v.z * f];
    const wy = Math.abs(w.y) > dw ? w.y - Math.sign(w.y) * dw : 0;
    b.body.setLinvel({ x: v.x - ax, y: v.y, z: v.z - az }, false);
    b.body.setAngvel({ x: w.x - az / BALL_R, y: wy, z: w.z + ax / BALL_R }, false);
  }
}

/**
 * Safety net: if the physical hit did not move the ball, give it the intended impulse.
 * @param {{ aimAngle: number, ballSpeed: number }} stroke
 */
export function ensureBallWasHit(cueBall, stroke) {
  const v = cueBall.body.linvel();
  if (Math.hypot(v.x, v.z) >= 0.3 * stroke.ballSpeed) return;
  console.warn("[Backroom Billard] cue stroke did not move the ball, applying the impulse");
  const m = cueBall.body.mass();
  cueBall.body.applyImpulse(
    { x: -Math.sin(stroke.aimAngle) * stroke.ballSpeed * m, y: 0, z: -Math.cos(stroke.aimAngle) * stroke.ballSpeed * m },
    true
  );
}
