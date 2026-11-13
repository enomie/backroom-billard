/**
 * Single cigarettes: unlit, glowing (ember, ash, shorter over time) or burnt down to the butt.
 * For now they lie in the notches of the ashtrays (the player's ashtray: one cigarette).
 * See _docs/cigarettes.md.
 */
import * as THREE from "three";
import {
  ASHTRAY_RADIUS,
  ASHTRAY_HEIGHT,
  ASHTRAY_NOTCHES,
  ASHTRAY_NOTCH_DEPTH,
  ASHTRAY_FLOOR,
} from "./ashtray-constants.js";
import {
  CIGARETTE_LENGTH,
  CIGARETTE_DIAMETER,
  CIGARETTE_FILTER_LENGTH,
  CIGARETTE_BURN_SECONDS,
  CIGARETTE_ASH_MAX,
  CIGARETTE_BUTT_PAPER,
  CIGARETTE_COLOR_PAPER,
  CIGARETTE_COLOR_FILTER,
  CIGARETTE_COLOR_ASH,
  CIGARETTE_COLOR_EMBER,
  CIGARETTE_EMBER_GLOW,
  CIGARETTE_GLOW_SIZE,
  CIGARETTE_REST_DISTANCE,
  CIGARETTE_TABLE_MIN,
  CIGARETTE_TABLE_MAX,
  CIGARETTE_SHARE_GLOWING,
  CIGARETTE_SHARE_UNLIT,
  CIGARETTE_START_BURN_MAX,
  CIGARETTE_SEED,
  SMOKE_WIDTH,
  SMOKE_HEIGHT,
  SMOKE_OPACITY,
  SMOKE_COLOR,
  SMOKING_BURN_FACTOR,
  SMOKING_DROP_BOUNCE,
  SMOKING_DROP_SPREAD,
  SMOKING_DROP_SPIN,
} from "./cigarette-constants.js";
import { glowTexture } from "./glow.js";
import { createSmokeColumn, faceCamera } from "./smoke.js";

const PAPER_FULL = CIGARETTE_LENGTH - CIGARETTE_FILTER_LENGTH;
/** A cigarette that burns down in the ashtray slips off the rim and reaches the dish after this long (s). */
const SLIP_TIME = 0.12;
const R = CIGARETTE_DIAMETER / 2;

/** Small deterministic random generator (same layout on every start). */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Beige-tan filter with fine speckles. */
function filterTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#dcae6c";
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,235,190,0.5)" : "rgba(160,110,50,0.3)";
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Where a cigarette lies when it rests in notch `k` of an ashtray slot: position and direction (toward the tip). */
function restingPose(slot, k, tipSupport) {
  const aw = (k * Math.PI * 2) / ASHTRAY_NOTCHES - slot.yaw; // world direction of the notch from the ashtray center
  const s = slot.scale;
  const rc = (ASHTRAY_RADIUS - 0.005) * s;
  const yc = slot.y + (ASHTRAY_HEIGHT - ASHTRAY_NOTCH_DEPTH) * s + R; // axis height over the notch floor
  const floorY = slot.y + ASHTRAY_FLOOR * s + R + 0.001;
  const rest = tipSupport; // length of the part inside the dish
  const tilt = Math.asin(THREE.MathUtils.clamp((yc - floorY) / rest, 0.05, 0.6)); // the tip rests on the dish floor
  const contact = new THREE.Vector3(slot.x + Math.cos(aw) * rc, yc, slot.z + Math.sin(aw) * rc);
  const dir = new THREE.Vector3(-Math.cos(aw) * Math.cos(tilt), -Math.sin(tilt), -Math.sin(aw) * Math.cos(tilt));
  return { origin: contact.clone().addScaledVector(dir, -CIGARETTE_REST_DISTANCE), dir };
}

/**
 * @param {THREE.Scene} scene
 * @param {{ x: number, y: number, z: number, yaw: number, scale: number, onFrame: boolean }[]} ashtraySlots
 * @returns {{ group: THREE.Group, update: (dt: number, camera: THREE.Camera) => void,
 *            playerCigarette: (camera: THREE.Camera) => object | null }}
 */
export function createCigarettes(scene, ashtraySlots) {
  const group = new THREE.Group();
  group.name = "cigarettes";
  const rnd = random(CIGARETTE_SEED);

  const unit = new THREE.CylinderGeometry(R, R, 1, 16).rotateZ(-Math.PI / 2); // 1 m long along +x
  const filterGeo = new THREE.CylinderGeometry(R, R, CIGARETTE_FILTER_LENGTH, 16).rotateZ(-Math.PI / 2);
  const emberGeo = new THREE.CylinderGeometry(R * 0.9, R * 0.9, 0.0006, 16).rotateZ(-Math.PI / 2);
  const paperMat = new THREE.MeshStandardMaterial({ color: CIGARETTE_COLOR_PAPER, roughness: 0.85 });
  const filterMat = new THREE.MeshStandardMaterial({ map: filterTexture(), color: CIGARETTE_COLOR_FILTER, roughness: 0.8 });
  const ashMat = new THREE.MeshStandardMaterial({ color: CIGARETTE_COLOR_ASH, roughness: 1 });
  const glowMap = glowTexture();

  /** @type {{ root: THREE.Group, onFrame: boolean, slot: object, rest: { position: THREE.Vector3, quaternion: THREE.Quaternion }, drawGlow: number, smoke: THREE.Mesh | null, tipX: number, state: string, burn: number, phase: number, paper: THREE.Mesh, ash: THREE.Mesh, ember: THREE.Mesh, emberMat: THREE.MeshBasicMaterial, glow: THREE.Sprite }[]} */
  const cigarettes = [];

  /** Put a cigarette into notch `notch` of an ashtray slot (state: "unlit" | "glowing" | "butt"). */
  function add(slot, notch, state, burnStart) {
    const { origin, dir } = restingPose(slot, notch, CIGARETTE_LENGTH - CIGARETTE_REST_DISTANCE);
    const root = new THREE.Group();
    root.position.copy(origin);
    root.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    root.rotateX(rnd() * Math.PI * 2); // roll around its axis (the speckles)

    const filter = new THREE.Mesh(filterGeo, filterMat);
    filter.position.x = CIGARETTE_FILTER_LENGTH / 2;
    const paper = new THREE.Mesh(unit, paperMat);
    const ash = new THREE.Mesh(unit, ashMat);
    const emberMat = new THREE.MeshBasicMaterial({ color: CIGARETTE_COLOR_EMBER, toneMapped: false });
    const ember = new THREE.Mesh(emberGeo, emberMat);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowMap, color: CIGARETTE_COLOR_EMBER, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    );
    glow.scale.setScalar(CIGARETTE_GLOW_SIZE);
    for (const m of [filter, paper, ash]) m.castShadow = m.receiveShadow = true;
    root.add(filter, paper, ash, ember, glow);
    group.add(root);

    const burn = burnStart ?? (state === "butt" ? 1 : state === "glowing" ? rnd() * CIGARETTE_START_BURN_MAX : 0);
    const c = {
      root, state, burn, phase: rnd() * 100, paper, ash, ember, emberMat, glow, smoke: null, tipX: 0,
      notch,
      held: false, // the player has it in the hand (smoking.js)
      landed: false, // lies in the dish for good (a butt)
      onFrame: slot.onFrame,
      slot, // the ashtray it belongs to
      rest: { position: root.position.clone(), quaternion: root.quaternion.clone() }, // where it lies in the ashtray
      drawGlow: 0, // 0…1: the ember glows brighter while the player draws on it
    };
    cigarettes.push(c);
    if (state === "glowing") ensureSmoke(c);
    if (state === "butt") settleInDish(c); // butts do not lie across the rim: they are in the dish
    shape(c, 0);
    return c;
  }

  /** The smoke thread of a glowing cigarette (made when it starts to glow). */
  function ensureSmoke(c) {
    if (c.smoke) return;
    c.smoke = createSmokeColumn({ width: SMOKE_WIDTH, height: SMOKE_HEIGHT, opacity: SMOKE_OPACITY, color: SMOKE_COLOR, seed: rnd() * 50 });
    c.smoke.visible = false; // shown (and placed) by the update
    group.add(c.smoke);
  }

  /** Lay a butt flat on the floor of its ashtray, anywhere in the dish. */
  function settleInDish(c) {
    const slot = c.slot;
    const r = rnd() * SMOKING_DROP_SPREAD * slot.scale;
    const a = rnd() * Math.PI * 2;
    c.root.position.set(slot.x + Math.cos(a) * r, slot.y + ASHTRAY_FLOOR * slot.scale + R, slot.z + Math.sin(a) * r);
    c.root.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
    c.rest.position.copy(c.root.position);
    c.rest.quaternion.copy(c.root.quaternion);
    c.landed = true;
    c.notch = -1;
  }

  /** Lengths, ash and ember for the current burn state. */
  function shape(c, time) {
    const paperLen = THREE.MathUtils.lerp(PAPER_FULL, CIGARETTE_BUTT_PAPER, c.burn);
    const ashLen = c.state === "unlit" ? 0 : c.burn >= 1 ? CIGARETTE_ASH_MAX * 0.6 : CIGARETTE_ASH_MAX * Math.min(1, c.burn / 0.15);
    c.paper.scale.x = Math.max(1e-4, paperLen);
    c.paper.position.x = CIGARETTE_FILTER_LENGTH + paperLen / 2;
    c.ash.scale.x = Math.max(1e-4, ashLen);
    c.ash.visible = ashLen > 0;
    c.ash.position.x = CIGARETTE_FILTER_LENGTH + paperLen + ashLen / 2;
    const tipX = CIGARETTE_FILTER_LENGTH + paperLen + ashLen;
    c.tipX = tipX;
    const lit = c.state === "glowing" && c.burn < 1;
    c.ember.visible = c.glow.visible = lit;
    if (lit) {
      const pulse = 0.85 + 0.15 * Math.sin(time * 1.7 + c.phase) + 0.08 * Math.sin(time * 4.3 + c.phase * 2.1);
      c.ember.position.x = tipX + 0.0003;
      c.emberMat.color.set(CIGARETTE_COLOR_EMBER).multiplyScalar(CIGARETTE_EMBER_GLOW * pulse * (1 + 1.2 * c.drawGlow));
      c.glow.position.x = tipX + 0.004;
      c.glow.material.opacity = Math.min(1, 0.6 * pulse * (1 + 0.8 * c.drawGlow));
      c.glow.scale.setScalar(CIGARETTE_GLOW_SIZE * (1 + 0.6 * c.drawGlow));
    }
  }

  /* ---- Falling into the dish: a burnt-down cigarette is let go and drops in (by hand: gravity, bounces) ---- */
  const falling = new Set();
  const _axis = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _tip = new THREE.Vector3();

  /** Let go of cigarette `c` where it is: it falls with `velocity` and `spin` until it lies in the dish. */
  function startFall(c, velocity, spin) {
    c.held = false;
    c.notch = -1;
    const length = Math.max(0.02, c.tipX);
    const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(c.root.quaternion);
    c.fall = { velocity: velocity.clone(), spin: spin.clone(), length, center: c.root.position.clone().addScaledVector(axis, length / 2) };
    falling.add(c);
  }

  /** One small step of the fall. Returns true when the butt lies still. */
  function stepFall(c, dt) {
    const f = c.fall;
    const half = f.length / 2;
    const slot = c.slot;
    const ground = slot.y + ASHTRAY_FLOOR * slot.scale + R;
    f.velocity.y -= 9.81 * dt;
    f.center.addScaledVector(f.velocity, dt);
    if (f.spin.lengthSq() > 1e-6) {
      c.root.quaternion.premultiply(_q.setFromAxisAngle(_axis.copy(f.spin).normalize(), f.spin.length() * dt));
    }
    const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(c.root.quaternion);
    const lowest = f.center.y - Math.abs(axis.y) * half;
    let settled = false;
    if (lowest < ground && f.velocity.y < 0) {
      f.center.y += ground - lowest;
      f.velocity.y = -f.velocity.y * SMOKING_DROP_BOUNCE;
      f.velocity.x += (Math.random() - 0.5) * 0.15;
      f.velocity.z += (Math.random() - 0.5) * 0.15;
      f.spin.multiplyScalar(0.4);
      settled = f.velocity.y < 0.25;
      axis.y *= settled ? 0 : 0.4; // each bounce lays it flatter; the last one lays it flat
      axis.normalize();
      const current = new THREE.Vector3(1, 0, 0).applyQuaternion(c.root.quaternion);
      c.root.quaternion.premultiply(_q.setFromUnitVectors(current, axis));
      if (settled) {
        f.center.y = ground;
        // it must lie in the dish, never beyond its rim
        const reach = Math.max(0.01, (ASHTRAY_RADIUS - 0.03) * slot.scale - half);
        const dx = f.center.x - slot.x;
        const dz = f.center.z - slot.z;
        const away = Math.hypot(dx, dz);
        if (away > reach) {
          f.center.x = slot.x + (dx / away) * reach;
          f.center.z = slot.z + (dz / away) * reach;
        }
      }
    }
    const a = new THREE.Vector3(1, 0, 0).applyQuaternion(c.root.quaternion);
    c.root.position.copy(f.center).addScaledVector(a, -half);
    if (settled) {
      c.rest.position.copy(c.root.position);
      c.rest.quaternion.copy(c.root.quaternion);
      c.landed = true;
      falling.delete(c);
    }
    return settled;
  }

  // Test setup: some cigarettes in every ashtray; the players' ashtrays on the frame get exactly one each
  for (const slot of ashtraySlots) {
    const count = slot.onFrame ? 1 : CIGARETTE_TABLE_MIN + Math.floor(rnd() * (CIGARETTE_TABLE_MAX - CIGARETTE_TABLE_MIN + 1));
    const notches = [...Array(ASHTRAY_NOTCHES).keys()].sort(() => rnd() - 0.5).slice(0, count);
    for (const notch of notches) {
      const r = rnd();
      const state = slot.onFrame || r < CIGARETTE_SHARE_GLOWING ? "glowing" : r < CIGARETTE_SHARE_GLOWING + CIGARETTE_SHARE_UNLIT ? "unlit" : "butt";
      add(slot, notch, state);
    }
  }

  scene.add(group);

  let time = 0;
  const frameSlots = ashtraySlots.filter((slot) => slot.onFrame);
  const putAside = [[], []]; // the cigarettes of a seat that is not taken
  const carriedSlot = { x: 0, y: -5, z: 0, yaw: 0, scale: 1, onFrame: false, side: -1 }; // (no dish: a cigarette in the hand of a guest without a seat)
  return {
    group,
    /** Total burn progress of all cigarettes in whole steps of `step` (a share of the length): changes when one has visibly got shorter. */
    burnSteps(step) {
      return cigarettes.reduce((n, c) => n + Math.floor(c.burn / step), 0);
    },
    /** The cigarettes in the ashtray of a seat are there only while the seat is taken (they are put aside and come back). */
    setSeat(side, present) {
      if (present) {
        for (const c of putAside[side].splice(0)) {
          group.add(c.root);
          if (c.smoke) group.add(c.smoke);
          cigarettes.push(c);
        }
        return;
      }
      for (let i = cigarettes.length - 1; i >= 0; i--) {
        const c = cigarettes[i];
        if (!c.slot.onFrame || c.slot.side !== side) continue;
        group.remove(c.root);
        if (c.smoke) group.remove(c.smoke);
        cigarettes.splice(i, 1);
        putAside[side].push(c);
      }
    },
    /** The glowing cigarette in the ashtray of player `side` (0 or 1), or null. */
    playerCigarette(side) {
      return cigarettes.find((c) => c.slot.onFrame && c.slot.side === side && c.state === "glowing" && c.burn < 1 && !c.landed && !c.fall) ?? null;
    },
    /** A new, unlit cigarette for player `side`, lying in a free notch of his ashtray. */
    spawn(side) {
      const slot = frameSlots[side];
      const used = new Set(cigarettes.filter((c) => c.slot === slot && c.notch >= 0).map((c) => c.notch));
      const free = [...Array(ASHTRAY_NOTCHES).keys()].filter((n) => !used.has(n));
      const c = add(slot, free.length ? free[Math.floor(rnd() * free.length)] : 0, "unlit", 0);
      c.held = true; // the player takes it at once
      return c;
    },
    /**
     * A new, unlit cigarette for a guest without a seat: it exists only while he smokes it (the hand puts it where it comes from, `rest`),
     * and is stubbed out and gone with `removeCarried`.
     */
    spawnCarried() {
      const c = add(frameSlots[0], 0, "unlit", 0); // (the notch only gives it a first pose)
      c.slot = carriedSlot;
      c.onFrame = false;
      c.carried = true;
      c.held = true;
      c.root.visible = false;
      return c;
    },
    removeCarried(c) {
      group.remove(c.root);
      if (c.smoke) group.remove(c.smoke);
      const i = cigarettes.indexOf(c);
      if (i >= 0) cigarettes.splice(i, 1);
      falling.delete(c);
      c.emberMat.dispose();
      c.glow.material.dispose();
      c.smoke?.material.dispose();
    },
    /** The cigarette starts to burn. */
    ignite(c) {
      c.state = "glowing";
      c.burn = 0.001;
      ensureSmoke(c);
    },
    /** Let go of a (burnt-down) cigarette: it drops into the dish from where it is. */
    drop(c) {
      startFall(c, new THREE.Vector3(), new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(SMOKING_DROP_SPIN));
    },
    update(dt, camera) {
      time += dt;
      for (const c of cigarettes) {
        if (c.state !== "glowing") continue;
        if (c.burn < 1) c.burn = Math.min(1, c.burn + (dt * (1 + (SMOKING_BURN_FACTOR - 1) * c.drawGlow)) / CIGARETTE_BURN_SECONDS);
        shape(c, time);
        // burnt down by itself in the ashtray: it slips off the rim and falls into the dish
        if (c.burn >= 1 && !c.held && !c.landed && !c.fall) {
          const slot = c.slot;
          const length = Math.max(0.02, c.tipX);
          const middle = new THREE.Vector3(1, 0, 0).applyQuaternion(c.root.quaternion).multiplyScalar(length / 2).add(c.root.position);
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * SMOKING_DROP_SPREAD * slot.scale;
          const ground = slot.y + ASHTRAY_FLOOR * slot.scale + R;
          // a short hop: it reaches a spot in the dish after FALL_TIME and lands there
          const velocity = new THREE.Vector3(
            (slot.x + Math.cos(a) * r - middle.x) / SLIP_TIME,
            (ground - middle.y + (9.81 * SLIP_TIME * SLIP_TIME) / 2) / SLIP_TIME,
            (slot.z + Math.sin(a) * r - middle.z) / SLIP_TIME
          );
          startFall(c, velocity, new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(4));
        }
        // the smoke thread rises from the ember while the cigarette glows
        if (c.smoke) {
          c.smoke.visible = c.burn < 1;
          if (c.smoke.visible) {
            c.root.updateMatrixWorld();
            c.smoke.position.copy(c.root.localToWorld(_tip.set(c.tipX + 0.004, 0, 0)));
            faceCamera(c.smoke, camera);
            c.smoke.material.uniforms.uTime.value = time;
            c.smoke.material.uniforms.uOpacity.value = SMOKE_OPACITY * (1 - 0.6 * c.drawGlow); // the smoke is drawn in, not rising
          }
        }
      }
      // falling butts: fixed small steps, so the bounce looks the same at any frame rate
      for (const c of [...falling]) {
        for (let left = Math.min(dt, 0.1); left > 0 && falling.has(c); left -= 1 / 240) stepFall(c, Math.min(left, 1 / 240));
      }
    },
  };
}
