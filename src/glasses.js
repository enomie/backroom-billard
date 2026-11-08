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
  WHITE_RUSSIAN_LEVEL,
  WHITE_RUSSIAN_COFFEE_SHARE,
  WHITE_RUSSIAN_COLOR_COFFEE,
  WHITE_RUSSIAN_COLOR_CREAM,
  GLASS_WALL,
  GLASS_COLOR,
  GLASS_OPACITY,
  GLASSES_PER_TABLE,
  GLASSES_RING_MIN,
  GLASSES_RING_MAX,
  GLASSES_SEED,
  GLASSES_WINE_SHARE,
  GLASSES_WHISKEY_SHARE,
  GLASSES_WHITE_RUSSIAN_SHARE,
  GLASSES_RED_SHARE,
  GLASSES_FRAME_Z,
  DRINK_SIPS,
  BEER_FOAM_DECAY_SECONDS,
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

/** Wine in the bowl; `share` (0…1) of the full amount. */
function wineLiquidGeometry(share = 1) {
  const y0 = WINE_GLASS_STEM_HEIGHT;
  const fill = WINE_FILL * Math.max(share, 0.01);
  const pts = [[0, y0 + 0.004]];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * fill;
    pts.push([Math.max(0.0005, bowlRadius(t) - GLASS_WALL - 0.0003), y0 + t * WINE_BOWL_HEIGHT + 0.004 * (1 - t)]);
  }
  pts.push([0, y0 + fill * WINE_BOWL_HEIGHT + 0.004 * (1 - fill)]);
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
  /** A layer of a layered drink between the heights `from` and `to`. */
  const layer = (from, to) => lathe([[0, from], [inner(from) - 0.0004, from], [inner(to) - 0.0004, to], [0, to]], 48);
  return { glass, liquid, layer, inner };
}

const beerShape = taperedGlass({ height: BEER_GLASS_HEIGHT, rBottom: BEER_GLASS_RADIUS_BOTTOM, rTop: BEER_GLASS_RADIUS_TOP, base: BEER_GLASS_BASE });
const whiskeyShape = taperedGlass({ height: WHISKEY_GLASS_HEIGHT, rBottom: WHISKEY_GLASS_RADIUS_BOTTOM, rTop: WHISKEY_GLASS_RADIUS_TOP, base: WHISKEY_GLASS_BASE });
const beerInnerRadius = beerShape.inner;

/** Height of the beer / whiskey surface for a share (0…1) of the full amount. */
const beerLevel = (share) => BEER_GLASS_BASE + (BEER_LEVEL - BEER_GLASS_BASE) * share;
const whiskeyLevel = (share) => WHISKEY_GLASS_BASE + (WHISKEY_LEVEL - WHISKEY_GLASS_BASE) * share;
/** White russian: the top of the drink and the height where the coffee layer ends and the cream starts. */
const russianLevel = (share) => WHISKEY_GLASS_BASE + (WHITE_RUSSIAN_LEVEL - WHISKEY_GLASS_BASE) * share;
const russianSplit = (share) => WHISKEY_GLASS_BASE + (russianLevel(share) - WHISKEY_GLASS_BASE) * WHITE_RUSSIAN_COFFEE_SHARE;

/**
 * Foam head: sits on the beer at `level`, domes up (slightly above the rim when full). With
 * `decay` (0…1) it gets thinner and a hole opens in the middle; at 1 only a ring at the wall is left.
 */
function beerFoamGeometry(level = BEER_LEVEL, decay = 0) {
  const height = BEER_FOAM_HEIGHT * (1 - 0.65 * decay);
  const top = level + height;
  const wall = (y) => beerInnerRadius(Math.min(y, BEER_GLASS_HEIGHT)) - 0.0004;
  const hole = decay > 0 ? wall(level) * Math.pow(decay, 1.3) * 0.92 : 0;
  const cap = Math.min(0.012, height * 0.6);
  const shoulder = top - cap;
  const pts = [[hole, level - 0.001], [wall(level), level - 0.001], [wall(level), level], [wall(shoulder), shoulder]];
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push([hole + (wall(shoulder) - hole) * Math.cos(a), shoulder + cap * Math.sin(a)]);
  }
  if (hole > 0.0005) pts.push([hole, level - 0.001]); // the wall of the hole
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
 * @returns {{ group: THREE.Group, taken: { x: number, z: number, r: number }[], player: object[],
 *            update: (dt: number) => void, applyReflection: (reflection: object) => void }}
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
    coffee: liquid(WHITE_RUSSIAN_COLOR_COFFEE, 0.85),
    cream: liquid(WHITE_RUSSIAN_COLOR_CREAM, 0.92, 0.35),
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
    russianCoffee: whiskeyShape.liquid(russianSplit(1)),
    russianCream: whiskeyShape.layer(russianSplit(1), russianLevel(1)),
    foam: beerFoamGeometry(),
  };

  /** Build one glass with its drink. `kind`: "wine-red" | "wine-white" | "beer" | "whiskey" | "white-russian". */
  const build = (kind) => {
    const g = new THREE.Group();
    const parts = {
      beer: [[geo.beer, glassMat, 2], [geo.beerLiquid, mats.beer, 0], [geo.foam, mats.foam, 0]],
      whiskey: [[geo.whiskey, glassMat, 2], [geo.whiskeyLiquid, mats.whiskey, 0]],
      "white-russian": [[geo.whiskey, glassMat, 2], [geo.russianCoffee, mats.coffee, 0], [geo.russianCream, mats.cream, 0]],
      "wine-red": [[geo.wine, glassMat, 2], [geo.wineLiquid, mats.red, 0]],
      "wine-white": [[geo.wine, glassMat, 2], [geo.wineLiquid, mats.white, 0]],
    }[kind];
    const meshes = parts.map(([geometry, material, order]) => {
      const m = new THREE.Mesh(geometry, material);
      m.renderOrder = order;
      g.add(m);
      return m;
    });
    const radius = { beer: BEER_GLASS_RADIUS_TOP, whiskey: WHISKEY_GLASS_RADIUS_TOP, "white-russian": WHISKEY_GLASS_RADIUS_TOP }[kind] ?? WINE_GLASS_BOWL_RADIUS;
    return { group: g, radius, kind, drink: meshes[1], foam: meshes[2] ?? null };
  };

  /** A glass with a level (share 1 = full … 0 = empty), sips left and, for beer, a decaying foam head. */
  function makePlayerGlass(initial) {
    let glass = initial;
    const state = {
      group: glass.group,
      kind: glass.kind,
      share: 1,
      sipsLeft: DRINK_SIPS,
      decay: 0,
      rest: { position: glass.group.position.clone(), quaternion: glass.group.quaternion.clone() },
      /** Change the level: the drink (and the foam on top) are rebuilt for the new height. */
      setShare(share) {
        state.share = THREE.MathUtils.clamp(share, 0, 1);
        refresh();
      },
      /** A new drink in a new glass (bought at the bar): the old glass is replaced on the spot. */
      replace(kind) {
        const next = build(kind);
        next.group.position.copy(state.rest.position);
        next.group.quaternion.copy(state.rest.quaternion);
        group.remove(state.group);
        group.add(next.group);
        glass = next;
        Object.assign(state, { group: next.group, kind, share: 1, sipsLeft: DRINK_SIPS, decay: 0 });
        refresh();
      },
      /** Per frame: the foam decays (rebuilt a few times per second only). */
      update(dt) {
        if (glass.kind !== "beer" || state.share <= 0 || state.decay >= 1) return;
        state.decay = Math.min(1, state.decay + dt / BEER_FOAM_DECAY_SECONDS);
        sinceRebuild += dt;
        if (sinceRebuild > 0.5) refresh();
      },
    };
    let sinceRebuild = 0;
    const refresh = () => {
      sinceRebuild = 0;
      const empty = state.share <= 0.001;
      glass.drink.visible = !empty;
      if (glass.foam) glass.foam.visible = !empty;
      if (empty) return;
      glass.drink.geometry.dispose();
      if (glass.kind === "beer") {
        glass.drink.geometry = beerShape.liquid(beerLevel(state.share));
        glass.foam.geometry.dispose();
        glass.foam.geometry = beerFoamGeometry(beerLevel(state.share), state.decay);
      } else if (glass.kind === "whiskey") {
        glass.drink.geometry = whiskeyShape.liquid(whiskeyLevel(state.share));
      } else if (glass.kind === "white-russian") {
        glass.drink.geometry = whiskeyShape.liquid(russianSplit(state.share));
        glass.foam.geometry.dispose();
        glass.foam.geometry = whiskeyShape.layer(russianSplit(state.share), russianLevel(state.share));
      } else {
        glass.drink.geometry = wineLiquidGeometry(state.share);
      }
    };
    return state;
  }

  const randomKind = () => {
    const r = rnd();
    if (r < GLASSES_WINE_SHARE) return rnd() < GLASSES_RED_SHARE ? "wine-red" : "wine-white";
    if (r < GLASSES_WINE_SHARE + GLASSES_WHISKEY_SHARE) return "whiskey";
    return r < GLASSES_WINE_SHARE + GLASSES_WHISKEY_SHARE + GLASSES_WHITE_RUSSIAN_SHARE ? "white-russian" : "beer";
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

  // Billard table: one drink per player on the left long side of the frame, next to the ashtrays.
  // Chosen anew on every load (not from the seed), and the two players never get the same drink.
  const frameX = -(PLAY_W / 2 + CUSHION_PROFILE_WIDTH + RAIL_WOOD_DEPTH / 2);
  const frameTop = TABLE_H + CUSHION_NOSE_TO_BED + 0.01;
  const drinks = ["wine-red", "wine-white", "beer", "whiskey", "white-russian"].sort(() => Math.random() - 0.5).slice(0, 2);
  /** The players' glasses: they can be drunk from (the level falls) and their foam falls apart. */
  const player = [-1, 1].map((sz, i) => {
    const glass = build(drinks[i]);
    glass.group.position.set(frameX, frameTop, sz * GLASSES_FRAME_Z);
    group.add(glass.group);
    return makePlayerGlass(glass);
  });

  scene.add(group);
  return {
    group,
    /** Everything standing on the round tables so far (for what comes next). */
    taken: occupied,
    /** The two players' glasses on the frame of the billard table. */
    player,
    update(dt) {
      for (const g of player) g.update(dt);
    },
    /** Let the glass reflect the room (call after the room reflection was captured). */
    applyReflection(reflection) {
      for (const m of [glassMat, mats.red, mats.white, mats.beer, mats.whiskey, mats.coffee, mats.cream]) {
        applyBallReflection(m, reflection, { clearGlass: true }); // the drinks are glossy and see-through too
        m.envMapIntensity = 1.6;
      }
    },
  };
}
