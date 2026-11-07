/**
 * Wine and beer glasses with their drink, built as solids of revolution from formulas.
 * They stand on some round tables (not on top of other things) and on the billard table's frame,
 * one per player with a random drink.
 */
import * as THREE from "three";
import { FURNITURE_TABLES, FURNITURE_TABLE_HEIGHT, FURNITURE_TABLE_RADIUS } from "./furniture-constants.js";
import { PLAY_W, TABLE_H, CUSHION_NOSE_TO_BED, CUSHION_PROFILE_WIDTH, RAIL_WOOD_DEPTH } from "./table-constants.js";
import {
  WINE_GLASS_HEIGHT,
  WINE_GLASS_BOWL_RADIUS,
  WINE_GLASS_STEM_RADIUS,
  WINE_GLASS_STEM_HEIGHT,
  WINE_GLASS_FOOT_RADIUS,
  WINE_FILL,
  WINE_COLOR_RED,
  WINE_COLOR_WHITE,
  BEER_GLASS_HEIGHT,
  BEER_GLASS_RADIUS_BOTTOM,
  BEER_GLASS_RADIUS_TOP,
  BEER_GLASS_BASE,
  BEER_LEVEL,
  BEER_FOAM_HEIGHT,
  BEER_COLOR,
  BEER_FOAM_COLOR,
  WHISKEY_GLASS_HEIGHT,
  WHISKEY_GLASS_RADIUS_BOTTOM,
  WHISKEY_GLASS_RADIUS_TOP,
  WHISKEY_GLASS_BASE,
  WHISKEY_LEVEL,
  WHISKEY_COLOR,
  GLASS_WALL,
  GLASS_COLOR,
  GLASS_OPACITY,
  GLASSES_PER_TABLE,
  GLASSES_RING_MIN,
  GLASSES_RING_MAX,
  GLASSES_SEED,
  GLASSES_WINE_SHARE,
  GLASSES_WHISKEY_SHARE,
  GLASSES_RED_SHARE,
  GLASSES_FRAME_Z,
} from "./glasses-constants.js";
import { applyBallReflection } from "./ball-reflection.js";

const lathe = (pts, segments = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/** Bowl radius of the wine glass at height share t (0 = bottom of the bowl, 1 = rim): a tulip. */
const bowlRadius = (t) =>
  WINE_GLASS_BOWL_RADIUS * Math.pow(Math.sin(Math.min(1, t * 1.12) * Math.PI / 2), 0.75) * (1 - 0.2 * t * t) + WINE_GLASS_STEM_RADIUS * (1 - t);

const WINE_BOWL_HEIGHT = WINE_GLASS_HEIGHT - WINE_GLASS_STEM_HEIGHT;
const STEPS = 14;

function wineGlassGeometry() {
  const y0 = WINE_GLASS_STEM_HEIGHT;
  const outer = [[0, 0], [WINE_GLASS_FOOT_RADIUS, 0], [WINE_GLASS_FOOT_RADIUS - 0.002, 0.0025], [0.012, 0.005], [WINE_GLASS_STEM_RADIUS + 0.002, 0.011], [WINE_GLASS_STEM_RADIUS, 0.02], [WINE_GLASS_STEM_RADIUS, y0 - 0.005]];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    outer.push([bowlRadius(t), y0 + t * WINE_BOWL_HEIGHT]);
  }
  const rim = bowlRadius(1);
  const inner = [[rim - GLASS_WALL, WINE_GLASS_HEIGHT]];
  for (let i = STEPS; i >= 0; i--) {
    const t = i / STEPS;
    inner.push([Math.max(0, bowlRadius(t) - GLASS_WALL), y0 + t * WINE_BOWL_HEIGHT + 0.004 * (1 - t)]);
  }
  inner.push([0, y0 + 0.004]);
  return lathe([...outer, ...inner], 64);
}

function wineLiquidGeometry() {
  const y0 = WINE_GLASS_STEM_HEIGHT;
  const pts = [[0, y0 + 0.004]];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * WINE_FILL;
    pts.push([Math.max(0.0005, bowlRadius(t) - GLASS_WALL - 0.0003), y0 + t * WINE_BOWL_HEIGHT + 0.004 * (1 - t)]);
  }
  pts.push([0, y0 + WINE_FILL * WINE_BOWL_HEIGHT + 0.004 * (1 - WINE_FILL)]);
  return lathe(pts, 48);
}

/**
 * A tapered, thick-bottomed glass (beer glass, whiskey tumbler): the glass and, inside, the drink
 * up to `level`.
 */
function taperedGlass({ height, rBottom, rTop, base }) {
  const inner = (y) => THREE.MathUtils.lerp(rBottom, rTop, y / height) - GLASS_WALL;
  const glass = lathe(
    [[0, 0], [rBottom - 0.003, 0], [rBottom, 0.003], [rTop, height], [inner(height), height], [inner(base), base], [0, base - 0.001]],
    64
  );
  const liquid = (level) => lathe([[0, base], [inner(base) - 0.0004, base], [inner(level) - 0.0004, level], [0, level]], 48);
  return { glass, liquid, inner };
}

const beerShape = taperedGlass({ height: BEER_GLASS_HEIGHT, rBottom: BEER_GLASS_RADIUS_BOTTOM, rTop: BEER_GLASS_RADIUS_TOP, base: BEER_GLASS_BASE });
const whiskeyShape = taperedGlass({ height: WHISKEY_GLASS_HEIGHT, rBottom: WHISKEY_GLASS_RADIUS_BOTTOM, rTop: WHISKEY_GLASS_RADIUS_TOP, base: WHISKEY_GLASS_BASE });
const beerInnerRadius = beerShape.inner;

/** Foam head: sits on the beer, reaches the rim and domes slightly above it. */
function beerFoamGeometry() {
  const top = BEER_LEVEL + BEER_FOAM_HEIGHT;
  const r = (y) => beerInnerRadius(Math.min(y, BEER_GLASS_HEIGHT)) - 0.0004;
  const pts = [[0, BEER_LEVEL - 0.001], [r(BEER_LEVEL), BEER_LEVEL - 0.001], [r(BEER_LEVEL), BEER_LEVEL], [r(BEER_GLASS_HEIGHT), BEER_GLASS_HEIGHT - 0.004]];
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push([r(BEER_GLASS_HEIGHT) * Math.cos(a), BEER_GLASS_HEIGHT - 0.004 + (top - BEER_GLASS_HEIGHT + 0.004) * Math.sin(a)]);
  }
  return lathe(pts, 48);
}

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

/**
 * @param {THREE.Scene} scene
 * @param {{ x: number, z: number, r: number }[]} taken — objects already on the tables (candles, ashtrays)
 * @returns {{ group: THREE.Group, applyReflection: (reflection: object) => void }}
 */
export function createGlasses(scene, taken) {
  const group = new THREE.Group();
  group.name = "glasses";
  const rnd = random(GLASSES_SEED);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: GLASS_COLOR,
    transparent: true,
    opacity: GLASS_OPACITY,
    roughness: 0.02,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    depthWrite: false,
  });
  const liquid = (color, opacity, roughness = 0.1) =>
    new THREE.MeshPhysicalMaterial({ color, transparent: opacity < 1, opacity, roughness, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  const mats = {
    red: liquid(WINE_COLOR_RED, 0.8),
    white: liquid(WINE_COLOR_WHITE, 0.5),
    beer: liquid(BEER_COLOR, 0.5),
    whiskey: liquid(WHISKEY_COLOR, 0.6),
    foam: liquid(BEER_FOAM_COLOR, 1, 0.9),
  };

  mats.beer.emissive.set(0x3a2204); // a little light shines through the drinks
  mats.whiskey.emissive.set(0x2a1604);

  const geo = {
    wine: wineGlassGeometry(),
    wineLiquid: wineLiquidGeometry(),
    beer: beerShape.glass,
    beerLiquid: beerShape.liquid(BEER_LEVEL),
    whiskey: whiskeyShape.glass,
    whiskeyLiquid: whiskeyShape.liquid(WHISKEY_LEVEL),
    foam: beerFoamGeometry(),
  };

  /** Build one glass with its drink. `kind`: "wine-red" | "wine-white" | "beer" | "whiskey". */
  const build = (kind) => {
    const g = new THREE.Group();
    const parts = {
      beer: [[geo.beer, glassMat, 2], [geo.beerLiquid, mats.beer, 0], [geo.foam, mats.foam, 0]],
      whiskey: [[geo.whiskey, glassMat, 2], [geo.whiskeyLiquid, mats.whiskey, 0]],
      "wine-red": [[geo.wine, glassMat, 2], [geo.wineLiquid, mats.red, 0]],
      "wine-white": [[geo.wine, glassMat, 2], [geo.wineLiquid, mats.white, 0]],
    }[kind];
    for (const [geometry, material, order] of parts) {
      const m = new THREE.Mesh(geometry, material);
      m.renderOrder = order;
      g.add(m);
    }
    const radius = { beer: BEER_GLASS_RADIUS_TOP, whiskey: WHISKEY_GLASS_RADIUS_TOP }[kind] ?? WINE_GLASS_BOWL_RADIUS;
    return { group: g, radius };
  };

  const randomKind = () => {
    const r = rnd();
    if (r < GLASSES_WINE_SHARE) return rnd() < GLASSES_RED_SHARE ? "wine-red" : "wine-white";
    return r < GLASSES_WINE_SHARE + GLASSES_WHISKEY_SHARE ? "whiskey" : "beer";
  };

  // Round tables: random drinks at free spots on the plate
  const occupied = taken.map((o) => ({ ...o }));
  for (const table of FURNITURE_TABLES) {
    const count = GLASSES_PER_TABLE[Math.floor(rnd() * GLASSES_PER_TABLE.length)];
    for (let n = 0; n < count; n++) {
      const glass = build(randomKind());
      for (let attempt = 0; attempt < 16; attempt++) {
        const angle = rnd() * Math.PI * 2;
        const ring = GLASSES_RING_MIN + rnd() * (GLASSES_RING_MAX - GLASSES_RING_MIN);
        const x = table.x + Math.cos(angle) * ring;
        const z = table.z + Math.sin(angle) * ring;
        const fits = ring + glass.radius < FURNITURE_TABLE_RADIUS - 0.02 &&
          occupied.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + glass.radius + 0.01);
        if (!fits) continue;
        glass.group.position.set(x, FURNITURE_TABLE_HEIGHT, z);
        glass.group.rotation.y = rnd() * Math.PI * 2;
        group.add(glass.group);
        occupied.push({ x, z, r: glass.radius });
        break;
      }
    }
  }

  // Billard table: one drink per player on the left long side of the frame, next to the ashtrays
  const frameX = -(PLAY_W / 2 + CUSHION_PROFILE_WIDTH + RAIL_WOOD_DEPTH / 2);
  const frameTop = TABLE_H + CUSHION_NOSE_TO_BED + 0.01;
  for (const sz of [-1, 1]) {
    const glass = build(randomKind());
    glass.group.position.set(frameX, frameTop, sz * GLASSES_FRAME_Z);
    group.add(glass.group);
  }

  scene.add(group);
  return {
    group,
    /** Let the glass reflect the room (call after the room reflection was captured). */
    applyReflection(reflection) {
      for (const m of [glassMat, mats.red, mats.white, mats.beer, mats.whiskey]) {
        applyBallReflection(m, reflection, { clearGlass: true }); // the drinks are glossy and see-through too
        m.envMapIntensity = 1.6;
      }
    },
  };
}
