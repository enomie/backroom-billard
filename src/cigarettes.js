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
} from "./cigarette-constants.js";
import { glowTexture } from "./glow.js";
import { createSmokeColumn, faceCamera } from "./smoke.js";

const PAPER_FULL = CIGARETTE_LENGTH - CIGARETTE_FILTER_LENGTH;
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

/** Orange filter with fine speckles. */
function filterTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#e0903f";
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,220,150,0.5)" : "rgba(150,70,20,0.35)";
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
 * @returns {{ group: THREE.Group, update: (dt: number, camera: THREE.Camera) => void }}
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

  /** @type {{ root: THREE.Group, smoke: THREE.Mesh | null, tipX: number, state: string, burn: number, phase: number, paper: THREE.Mesh, ash: THREE.Mesh, ember: THREE.Mesh, emberMat: THREE.MeshBasicMaterial, glow: THREE.Sprite }[]} */
  const cigarettes = [];

  function add(slot, notch, state) {
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

    const burn = state === "butt" ? 1 : state === "glowing" ? rnd() * CIGARETTE_START_BURN_MAX : 0;
    const smoke = state === "glowing" ? createSmokeColumn({ width: SMOKE_WIDTH, height: SMOKE_HEIGHT, opacity: SMOKE_OPACITY, color: SMOKE_COLOR, seed: rnd() * 50 }) : null;
    if (smoke) {
      smoke.visible = false; // shown (and placed) by the first update
      group.add(smoke);
    }
    const c = { root, state, burn, phase: rnd() * 100, paper, ash, ember, emberMat, glow, smoke, tipX: 0 };
    cigarettes.push(c);
    shape(c, 0);
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
      c.emberMat.color.set(CIGARETTE_COLOR_EMBER).multiplyScalar(CIGARETTE_EMBER_GLOW * pulse);
      c.glow.position.x = tipX + 0.004;
      c.glow.material.opacity = 0.6 * pulse;
    }
  }

  // Test setup: some cigarettes in every ashtray; the player's ashtray on the frame gets exactly one
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
  return {
    group,
    update(dt, camera) {
      time += dt;
      for (const c of cigarettes) {
        if (c.state !== "glowing") continue;
        if (c.burn < 1) c.burn = Math.min(1, c.burn + dt / CIGARETTE_BURN_SECONDS);
        shape(c, time);
        // the smoke thread rises from the ember while the cigarette glows
        c.smoke.visible = c.burn < 1;
        if (c.smoke.visible) {
          c.root.updateMatrixWorld();
          c.smoke.position.copy(c.root.localToWorld(new THREE.Vector3(c.tipX + 0.004, 0, 0)));
          faceCamera(c.smoke, camera);
          c.smoke.material.uniforms.uTime.value = time;
        }
      }
    },
  };
}
