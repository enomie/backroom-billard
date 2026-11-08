/**
 * Candle holders (dark red glaze) with a white candle and a flickering flame on every round table.
 * The flame glows everywhere; the few candles nearest to the camera also light their surroundings.
 */
import * as THREE from "three";
import { FURNITURE_TABLES, FURNITURE_TABLE_HEIGHT } from "./furniture-constants.js";
import {
  CANDLE_DIAMETER,
  CANDLE_HEIGHT,
  CANDLE_COLOR_WAX,
  HOLDER_COLOR,
  HOLDER_DISH_RADIUS,
  HOLDER_TUBE_RADIUS,
  HOLDER_TUBE_HEIGHT,
  HOLDER_KNOB_RADIUS,
  CANDLE_OFFSET_MAX,
  CANDLE_SEED,
  FLAME_HEIGHT,
  FLAME_RADIUS,
  FLAME_COLOR,
  FLAME_GLOW_SIZE,
  FLAME_GLOW_OPACITY,
  CANDLE_REAL_LIGHTS,
  CANDLE_LIGHT_COLOR,
  CANDLE_LIGHT_INTENSITY,
  CANDLE_LIGHT_DISTANCE,
  CANDLE_LIGHT_DECAY,
  CANDLE_LIGHT_FADE,
  CANDLE_LIGHT_REASSIGN,
} from "./candle-constants.js";
import { applyBallReflection } from "./ball-reflection.js";
import { glowTexture } from "./glow.js";
import { smokeLightUniforms } from "./smoke-light.js";

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

/** Dish with a raised rim and a tube in the middle, as one solid of revolution. */
function holderGeometry() {
  const R = HOLDER_DISH_RADIUS;
  const r = HOLDER_TUBE_RADIUS;
  const h = HOLDER_TUBE_HEIGHT;
  const hole = CANDLE_DIAMETER / 2 + 0.0015;
  const pts = [
    [0, 0], [R - 0.008, 0], [R - 0.002, 0.003], [R, 0.01], [R, 0.02], [R - 0.003, 0.0235],
    [R - 0.007, 0.022], [R - 0.011, 0.014], [R - 0.02, 0.0095], [r + 0.012, 0.0085],
    [r + 0.004, 0.011], [r, 0.02], [r, h - 0.004], [r - 0.003, h], [hole + 0.002, h],
    [hole, h - 0.003], [hole, 0.012], [0, 0.012],
  ];
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 48);
}

/** Teardrop flame, pointed at the top. */
function flameGeometry(scale = 1) {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10; // 0 bottom … 1 tip
    pts.push(new THREE.Vector2(Math.max(0.0001, FLAME_RADIUS * scale * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - 0.4 * t)), t * FLAME_HEIGHT * scale));
  }
  return new THREE.LatheGeometry(pts, 12);
}

/** Irregular flicker around 1 (sum of incommensurate sines). */
const flicker = (t, phase) =>
  1 + 0.1 * Math.sin(t * 9 + phase) + 0.07 * Math.sin(t * 14.3 + phase * 1.7) + 0.05 * Math.sin(t * 23.1 + phase * 0.6);

/**
 * @param {THREE.Scene} scene
 * @returns {{ group: THREE.Group, taken: { x: number, z: number, r: number }[],
 *            update: (dt: number, camera: THREE.Camera) => void,
 *            applyReflection: (reflection: object) => void }}
 */
export function createCandles(scene) {
  const group = new THREE.Group();
  group.name = "candles";
  const rnd = random(CANDLE_SEED);

  const holderMat = new THREE.MeshPhysicalMaterial({
    color: HOLDER_COLOR,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  const waxMat = new THREE.MeshStandardMaterial({
    color: CANDLE_COLOR_WAX,
    roughness: 0.55,
    emissive: 0x3a2410, // light scatters a little through the wax
  });
  const wickMat = new THREE.MeshBasicMaterial({ color: 0x15100c });
  const outerMat = new THREE.MeshBasicMaterial({ color: FLAME_COLOR, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false });
  const innerMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, toneMapped: false });
  const glowMap = glowTexture();

  const holderGeo = holderGeometry();
  const knobGeo = new THREE.SphereGeometry(HOLDER_KNOB_RADIUS, 20, 14);
  const candleGeo = new THREE.CylinderGeometry(CANDLE_DIAMETER / 2, CANDLE_DIAMETER / 2, CANDLE_HEIGHT, 24);
  const wickGeo = new THREE.CylinderGeometry(0.0013, 0.0013, 0.012, 6);
  const outerGeo = flameGeometry(1);
  const innerGeo = flameGeometry(0.55);

  const candleBaseY = 0.012; // bottom of the tube
  // Standing parts: [geometry, material, position in the candle's frame, casts a shadow]
  const statics = [
    [holderGeo, holderMat, [0, 0, 0], true],
    [knobGeo, holderMat, [HOLDER_TUBE_RADIUS + HOLDER_KNOB_RADIUS * 0.55, HOLDER_TUBE_HEIGHT * 0.72, 0], true],
    [candleGeo, waxMat, [0, candleBaseY + CANDLE_HEIGHT / 2, 0], true],
    [wickGeo, wickMat, [0, candleBaseY + CANDLE_HEIGHT + 0.005, 0], false],
  ];
  const staticMatrices = statics.map(() => []);
  const candles = FURNITURE_TABLES.map((table, i) => {
    const angle = rnd() * Math.PI * 2;
    const offset = Math.sqrt(rnd()) * CANDLE_OFFSET_MAX;
    const root = new THREE.Group();
    root.position.set(table.x + Math.cos(angle) * offset, FURNITURE_TABLE_HEIGHT, table.z + Math.sin(angle) * offset);
    root.rotation.y = rnd() * Math.PI * 2;

    // The standing parts (holder, knob, wax, wick) are the same on every table: they are drawn as
    // one instanced mesh each (see below); only the flame and its glow are per candle
    const topY = candleBaseY + CANDLE_HEIGHT;
    root.updateMatrix();
    statics.forEach(([, , position], k) => staticMatrices[k].push(root.matrix.clone().multiply(new THREE.Matrix4().makeTranslation(...position))));

    // Flame (pivot at its base, so it can sway and stretch) and its soft glow
    const flame = new THREE.Group();
    flame.position.y = topY + 0.006;
    flame.add(new THREE.Mesh(outerGeo, outerMat), new THREE.Mesh(innerGeo, innerMat));
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowMap, color: FLAME_COLOR, transparent: true, opacity: FLAME_GLOW_OPACITY, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    );
    glow.scale.setScalar(FLAME_GLOW_SIZE);
    glow.position.y = topY + 0.006 + FLAME_HEIGHT * 0.4;

    root.add(flame, glow);
    group.add(root);
    return { root, flame, glow, phase: rnd() * 100, topY, strength: 1 };
  });

  statics.forEach(([geometry, material, , castShadow], k) => {
    const mesh = new THREE.InstancedMesh(geometry, material, staticMatrices[k].length);
    staticMatrices[k].forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = mesh.receiveShadow = castShadow;
    group.add(mesh);
  });

  // Pool of real lights, moved to the candles nearest to the camera
  // the smoke shaders light the smoke around the flames
  candles.forEach((c, i) => smokeLightUniforms.uCandles.value[i].set(c.root.position.x, c.root.position.y + c.topY + FLAME_HEIGHT * 0.5, c.root.position.z));

  const lights = Array.from({ length: Math.min(CANDLE_REAL_LIGHTS, candles.length) }, () => {
    const light = new THREE.PointLight(CANDLE_LIGHT_COLOR, 0, CANDLE_LIGHT_DISTANCE, CANDLE_LIGHT_DECAY);
    group.add(light);
    return { light, current: -1, wanted: -1, level: 0 };
  });

  scene.add(group);

  let time = 0;
  let sinceAssign = Infinity;
  const world = new THREE.Vector3();

  function assign(camera) {
    const nearest = candles
      .map((c, i) => ({ i, d: c.root.position.distanceToSquared(camera.position) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, lights.length)
      .map((n) => n.i);
    // keep lights that already sit on a wanted candle, give the rest to free lights
    const free = lights.filter((l) => !nearest.includes(l.wanted));
    const missing = nearest.filter((i) => !lights.some((l) => l.wanted === i));
    free.forEach((l, k) => (l.wanted = missing[k] ?? -1));
  }

  return {
    group,
    /** Where the holders stand (so other things keep clear of them). */
    taken: candles.map((c) => ({ x: c.root.position.x, z: c.root.position.z, r: HOLDER_DISH_RADIUS })),
    update(dt, camera) {
      time += dt;
      sinceAssign += dt;
      if (sinceAssign >= CANDLE_LIGHT_REASSIGN) {
        sinceAssign = 0;
        assign(camera);
      }
      candles.forEach((c) => {
        const f = flicker(time, c.phase);
        const stretch = 0.9 + (f - 1) * 1.6;
        c.flame.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
        c.flame.rotation.z = Math.sin(time * 5 + c.phase) * 0.08 * (f - 0.6);
        c.glow.material.opacity = FLAME_GLOW_OPACITY * (0.75 + (f - 1) * 2.2);
      });
      for (const l of lights) {
        // fade out, move to the wanted candle, fade in
        if (l.current !== l.wanted) {
          l.level = Math.max(0, l.level - dt / CANDLE_LIGHT_FADE);
          if (l.level === 0) l.current = l.wanted;
        } else if (l.current >= 0) {
          l.level = Math.min(1, l.level + dt / CANDLE_LIGHT_FADE);
        }
        const c = candles[l.current];
        if (c) {
          l.light.position.copy(c.root.localToWorld(world.set(0, c.topY + FLAME_HEIGHT * 0.6, 0)));
          l.light.position.sub(group.position);
          l.light.intensity = CANDLE_LIGHT_INTENSITY * l.level * flicker(time, c.phase);
        } else {
          l.light.intensity = 0;
        }
      }
    },
    /** Let the glaze reflect the room (call after the room reflection was captured). */
    applyReflection(reflection) {
      applyBallReflection(holderMat, reflection);
    },
  };
}
