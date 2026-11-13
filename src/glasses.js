/**
 * The glasses with their drink (wine, beer, whiskey, cognac, champagne, vodka, gin tonic, cocktails),
 * built as solids of revolution from formulas, some with ice cubes that melt.
 * They stand on some round tables (not on top of other things) and on the billard table's frame,
 * one per player with a random drink.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FURNITURE_TABLES, FURNITURE_TABLE_HEIGHT, FURNITURE_TABLE_RADIUS } from "./furniture-constants.js";
import { PLAY_W, TABLE_H, CUSHION_NOSE_TO_BED, CUSHION_PROFILE_WIDTH, RAIL_WOOD_DEPTH } from "./table-constants.js";
import {
  WINE_GLASS_HEIGHT,
  WINE_GLASS_BOWL_RADIUS,
  WINE_GLASS_STEM_RADIUS,
  WINE_GLASS_STEM_HEIGHT,
  WINE_GLASS_FOOT_RADIUS,
  WINE_FILL,
  BEER_GLASS_HEIGHT,
  BEER_GLASS_RADIUS_BOTTOM,
  BEER_GLASS_RADIUS_TOP,
  BEER_GLASS_BASE,
  BEER_LEVEL,
  BEER_FOAM_HEIGHT,
  BEER_FOAM_COLOR,
  WHISKEY_GLASS_HEIGHT,
  WHISKEY_GLASS_RADIUS_BOTTOM,
  WHISKEY_GLASS_RADIUS_TOP,
  WHISKEY_GLASS_BASE,
  WHISKEY_LEVEL,
  WHITE_RUSSIAN_LEVEL,
  WHITE_RUSSIAN_COFFEE_SHARE,
  VODKA_GLASS_HEIGHT,
  VODKA_GLASS_RADIUS_BOTTOM,
  VODKA_GLASS_RADIUS_TOP,
  VODKA_GLASS_BASE,
  VODKA_LEVEL,
  HIGHBALL_GLASS_HEIGHT,
  HIGHBALL_GLASS_RADIUS_BOTTOM,
  HIGHBALL_GLASS_RADIUS_TOP,
  HIGHBALL_GLASS_BASE,
  GIN_TONIC_LEVEL,
  LIME_RADIUS,
  LIME_THICKNESS,
  SNIFTER,
  FLUTE,
  COCKTAIL_GLASS,
  CHERRY_RADIUS,
  CHERRY_COLOR,
  PICK_RADIUS,
  ICE,
  ICE_SINK,
  ICE_MELT_SECONDS,
  ICE_MELT_MIN,
  ICE_ROUNDING,
  LIQUID_LOOKS,
  GLASS_WALL,
  GLASS_COLOR,
  GLASS_OPACITY,
  GLASSES_PER_TABLE,
  GLASSES_RING_MIN,
  GLASSES_RING_MAX,
  GLASSES_SEED,
  GLASSES_KIND_WEIGHTS,
  GLASSES_FRAME_Z,
  DRINK_SIPS,
  BEER_FOAM_DECAY_SECONDS,
} from "./glasses-constants.js";
import { applyBallReflection } from "./ball-reflection.js";

const lathe = (pts, segments = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/** A lathe whose profile points have a brightness each (vertex colors; above 1 = brighter than the material). */
function latheShaded(pts, brightness, segments = 48) {
  const geometry = lathe(pts, segments);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let v = 0; v < geometry.attributes.position.count; v++) colors.fill(brightness[v % pts.length], v * 3, v * 3 + 3);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Bowl radius of the wine glass at height share t (0 = bottom of the bowl, 1 = rim): a tulip. */
const bowlRadius = (t) =>
  WINE_GLASS_BOWL_RADIUS * Math.pow(Math.sin(Math.min(1, t * 1.12) * Math.PI / 2), 0.75) * (1 - 0.2 * t * t) + WINE_GLASS_STEM_RADIUS * (1 - t);

const STEPS = 14;

/**
 * A glass on a stem (wine, cognac, champagne, cocktail): foot, stem and a bowl whose radius at
 * height share t is `bowl(t)`. Returns the glass and the drink in the bowl: `share` (0…1) of the
 * full amount (`fill` of the bowl height, falling with share^`volume`), with a meniscus
 * [height, width] if given.
 */
function stemmedGlass({ height, stem, foot, bowl, fill, volume = 1 }) {
  const y0 = stem;
  const bowlHeight = height - stem;
  const r = WINE_GLASS_STEM_RADIUS;
  const outer = [[0, 0], [foot, 0], [foot - 0.002, 0.0025], [0.012, 0.005], [r + 0.002, 0.011], [r, 0.02], [r, y0 - 0.005]];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    outer.push([bowl(t), y0 + t * bowlHeight]);
  }
  const inner = [[bowl(1) - GLASS_WALL, height]];
  for (let i = STEPS; i >= 0; i--) {
    const t = i / STEPS;
    inner.push([Math.max(0, bowl(t) - GLASS_WALL), y0 + t * bowlHeight + 0.004 * (1 - t)]);
  }
  inner.push([0, y0 + 0.004]);
  const glass = lathe([...outer, ...inner], 64);

  const liquid = (share = 1, meniscus = null) => {
    const top = fill * Math.max(Math.pow(share, volume), 0.01);
    const wall = (t) => Math.max(0.0005, bowl(t) - GLASS_WALL - 0.0003);
    const y = (t) => y0 + t * bowlHeight + 0.004 * (1 - t);
    const pts = [[0, y0 + 0.004]];
    const brightness = [0.8];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * top;
      pts.push([wall(t), y(t)]);
      brightness.push(1);
    }
    if (meniscus) {
      // the surface climbs the wall a little and falls in a curve to the level in the middle
      const h = meniscus[0];
      const w = Math.min(meniscus[1], wall(top) * 0.8);
      pts[pts.length - 1] = [wall(top), y(top) + h];
      brightness[brightness.length - 1] = 1.7;
      for (const k of [0.25, 0.5, 0.75, 1]) {
        pts.push([wall(top) - w * k, y(top) + h * (1 - k) ** 2]);
        brightness.push(1.5 - 0.6 * k);
      }
    }
    pts.push([0, y(top)]);
    brightness.push(0.8);
    return latheShaded(pts, brightness, 48);
  };
  return { glass, liquid };
}

const wineShape = stemmedGlass({ height: WINE_GLASS_HEIGHT, stem: WINE_GLASS_STEM_HEIGHT, foot: WINE_GLASS_FOOT_RADIUS, bowl: bowlRadius, fill: WINE_FILL });
/** Cognac snifter: a wide belly that closes in towards the rim. */
const snifterShape = stemmedGlass({
  ...SNIFTER,
  bowl: (t) =>
    (t < 0.42 ? SNIFTER.bowl * Math.pow(Math.sin((t / 0.42) * Math.PI / 2), 0.6) : SNIFTER.bowl * (1 - 0.36 * Math.pow((t - 0.42) / 0.58, 1.6))) +
    WINE_GLASS_STEM_RADIUS * (1 - t),
});
/** Champagne flute: tall and narrow. */
const fluteShape = stemmedGlass({
  ...FLUTE,
  bowl: (t) => FLUTE.bowl * Math.pow(Math.sin(Math.min(1, t * 1.25) * Math.PI / 2), 0.7) * (1 - 0.08 * t) + WINE_GLASS_STEM_RADIUS * (1 - t),
});
/** Cocktail glass: a wide, straight cone. */
const cocktailShape = stemmedGlass({
  ...COCKTAIL_GLASS,
  bowl: (t) => WINE_GLASS_STEM_RADIUS + (COCKTAIL_GLASS.bowl - WINE_GLASS_STEM_RADIUS) * Math.pow(t, 0.9),
});

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
  /**
   * A drink or a layer of it between the heights `from` and `to`. With a `meniscus` [height, width]
   * the liquid climbs up the glass wall a little and falls in a smooth curve to the level in the
   * middle; the climbing edge is bright (it catches the light), the middle of the surface a bit
   * dark. `shade` [bottom, top] brightens or darkens the layer from below to above (a soft
   * transition between layers).
   */
  const layer = (from, to, meniscus = null, shade = [1, 1]) => {
    const wall = (y) => inner(y) - 0.0004;
    const pts = [[0, from], [wall(from), from]];
    const brightness = [0.8 * shade[0], shade[0]];
    if (meniscus) {
      const [h, w] = meniscus;
      pts.push([wall(to + h), to + h]);
      brightness.push(1.7 * shade[1]);
      for (const t of [0.25, 0.5, 0.75, 1]) {
        pts.push([wall(to + h) - w * t, to + h * (1 - t) ** 2]);
        brightness.push((1.5 - 0.6 * t) * shade[1]);
      }
    } else {
      pts.push([wall(to), to]);
      brightness.push(shade[1]);
    }
    pts.push([0, to]);
    brightness.push(0.8 * shade[1]);
    return latheShaded(pts, brightness, 48);
  };
  const liquid = (level, meniscus = null) => layer(base, level, meniscus);
  return { glass, liquid, layer, inner };
}

const beerShape = taperedGlass({ height: BEER_GLASS_HEIGHT, rBottom: BEER_GLASS_RADIUS_BOTTOM, rTop: BEER_GLASS_RADIUS_TOP, base: BEER_GLASS_BASE });
const whiskeyShape = taperedGlass({ height: WHISKEY_GLASS_HEIGHT, rBottom: WHISKEY_GLASS_RADIUS_BOTTOM, rTop: WHISKEY_GLASS_RADIUS_TOP, base: WHISKEY_GLASS_BASE });
const vodkaShape = taperedGlass({ height: VODKA_GLASS_HEIGHT, rBottom: VODKA_GLASS_RADIUS_BOTTOM, rTop: VODKA_GLASS_RADIUS_TOP, base: VODKA_GLASS_BASE });
const highballShape = taperedGlass({ height: HIGHBALL_GLASS_HEIGHT, rBottom: HIGHBALL_GLASS_RADIUS_BOTTOM, rTop: HIGHBALL_GLASS_RADIUS_TOP, base: HIGHBALL_GLASS_BASE });
const beerInnerRadius = beerShape.inner;

/** Height of the surface in a tapered glass for a share (0…1) of the full amount. */
const levelOf = (base, full) => (share) => base + (full - base) * share;
const beerLevel = levelOf(BEER_GLASS_BASE, BEER_LEVEL);
const whiskeyLevel = levelOf(WHISKEY_GLASS_BASE, WHISKEY_LEVEL);
const vodkaLevel = levelOf(VODKA_GLASS_BASE, VODKA_LEVEL);
const ginTonicLevel = levelOf(HIGHBALL_GLASS_BASE, GIN_TONIC_LEVEL);
/** White russian: the top of the drink and the height where the coffee layer ends and the cream starts. */
const russianLevel = levelOf(WHISKEY_GLASS_BASE, WHITE_RUSSIAN_LEVEL);
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

/**
 * Every drink: its glass, its top radius, the layers of the drink (material name and a shape for a
 * share 0…1 of the full amount and an age in seconds: the beer foam falls apart with it), and
 * where the ice and the garnish float (`level(share)` is the surface, `base` the glass floor).
 */
const foamDecay = (age) => Math.min(1, age / BEER_FOAM_DECAY_SECONDS);
const KINDS = {
  beer: {
    glass: beerShape.glass,
    radius: BEER_GLASS_RADIUS_TOP,
    layers: [["beer", (s) => beerShape.liquid(beerLevel(s), LIQUID_LOOKS.beer.meniscus)], ["foam", (s, age) => beerFoamGeometry(beerLevel(s), foamDecay(age))]],
  },
  "wine-red": { glass: wineShape.glass, radius: WINE_GLASS_BOWL_RADIUS, layers: [["red", (s) => wineShape.liquid(s, LIQUID_LOOKS.redWine.meniscus)]] },
  "wine-white": { glass: wineShape.glass, radius: WINE_GLASS_BOWL_RADIUS, layers: [["white", (s) => wineShape.liquid(s, LIQUID_LOOKS.whiteWine.meniscus)]] },
  champagne: { glass: fluteShape.glass, radius: FLUTE.bowl, layers: [["champagne", (s) => fluteShape.liquid(s, LIQUID_LOOKS.champagne.meniscus)]] },
  whiskey: {
    glass: whiskeyShape.glass,
    radius: WHISKEY_GLASS_RADIUS_TOP,
    layers: [["whiskey", (s) => whiskeyShape.liquid(whiskeyLevel(s), LIQUID_LOOKS.whiskey.meniscus)]],
    level: whiskeyLevel,
    base: WHISKEY_GLASS_BASE,
  },
  cognac: { glass: snifterShape.glass, radius: SNIFTER.bowl, layers: [["cognac", (s) => snifterShape.liquid(s, LIQUID_LOOKS.cognac.meniscus)]] },
  vodka: {
    glass: vodkaShape.glass,
    radius: VODKA_GLASS_RADIUS_TOP,
    layers: [["vodka", (s) => vodkaShape.liquid(vodkaLevel(s), LIQUID_LOOKS.vodka.meniscus)]],
    level: vodkaLevel,
    base: VODKA_GLASS_BASE,
  },
  "gin-tonic": {
    glass: highballShape.glass,
    radius: HIGHBALL_GLASS_RADIUS_TOP,
    layers: [["tonic", (s) => highballShape.liquid(ginTonicLevel(s), LIQUID_LOOKS.tonic.meniscus)]],
    level: ginTonicLevel,
    base: HIGHBALL_GLASS_BASE,
    lime: true,
  },
  "white-russian": {
    glass: whiskeyShape.glass,
    radius: WHISKEY_GLASS_RADIUS_TOP,
    layers: [
      ["coffee", (s) => whiskeyShape.layer(WHISKEY_GLASS_BASE, russianSplit(s), null, [1, 1.7])], // lighter towards the cream
      ["cream", (s) => whiskeyShape.layer(russianSplit(s), russianLevel(s), LIQUID_LOOKS.cream.meniscus, [0.78, 1])], // a little browner below
    ],
    level: russianLevel,
    base: WHISKEY_GLASS_BASE,
  },
  cocktail: { glass: cocktailShape.glass, radius: COCKTAIL_GLASS.bowl, layers: [["cocktail", (s) => cocktailShape.liquid(s, LIQUID_LOOKS.cocktail.meniscus)]], cherry: true },
};
/** All drinks (the menu, the bar and the tables use these names). */
export const DRINK_KINDS = Object.keys(KINDS);

/** A lime slice: green rind, white pith, pale pulp in segments (the texture of the round faces). */
function limeTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d");
  const ring = (r, color) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(size / 2, size / 2, r * size / 2, 0, Math.PI * 2);
    c.fill();
  };
  ring(1, "#3f6e16");
  ring(0.9, "#eef0d8");
  ring(0.82, "#c4d660");
  c.strokeStyle = "#eef0d0";
  c.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    c.beginPath();
    c.moveTo(size / 2, size / 2);
    c.lineTo(size / 2 + Math.cos(a) * size * 0.41, size / 2 + Math.sin(a) * size * 0.41);
    c.stroke();
  }
  ring(0.08, "#eef0d0");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
  const liquidTime = { value: 0 }; // seconds, for the rising bubbles
  const colorVec = (hex) => {
    const k = new THREE.Color(hex);
    return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`;
  };
  /** A clear drink: dark in the middle of the glass, light and thin at the edges (see LIQUID_LOOKS). */
  const clearLiquid = (look, key) => {
    const material = new THREE.MeshPhysicalMaterial({
      color: look.center,
      transparent: true,
      opacity: look.opacityCenter,
      roughness: look.roughness ?? 0.1,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      vertexColors: look.vertexColors ?? true, // the bright meniscus, the dark middle of the surface (the lathes have them)
    });
    material.onBeforeCompile = (shader) => {
      if (look.sparkle) {
        // fine bubbles: tiny bright points at fixed places in the liquid
        shader.uniforms.uTime = liquidTime;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vLiquid;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLiquid = position;");
        shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vLiquid;\nuniform float uTime;");
      }
      // round bubbles that rise: a lattice of cells, one bubble in some of them; each column rises at its own speed
      const sparkle = look.sparkle
        ? `vec2 column = floor( vLiquid.xz * 420.0 );
          float rise = 0.6 + 0.8 * fract( sin( dot( column, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
          vec3 bp = vec3( vLiquid.x * 420.0, vLiquid.y * 420.0 - uTime * rise * 4.0, vLiquid.z * 420.0 );
          vec3 cell = floor( bp );
          vec3 h = fract( sin( vec3( dot( cell, vec3( 12.9898, 78.233, 37.719 ) ), dot( cell, vec3( 39.346, 11.135, 83.155 ) ), dot( cell, vec3( 73.156, 52.235, 9.151 ) ) ) ) * 43758.5453 );
          float bubble = h.x < ${look.sparkle.toFixed(3)} ? 1.0 - smoothstep( 0.14, 0.26, length( bp - cell - ( 0.3 + 0.4 * h.yzy ) ) ) : 0.0;
          totalEmissiveRadiance += bubble * ${colorVec(look.bubble ?? 0xbcad7c)};`
        : "";
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          float depth = pow( clamp( abs( dot( normal, normalize( vViewPosition ) ) ), 0.0, 1.0 ), ${look.power.toFixed(2)} );
          totalEmissiveRadiance += ( 1.0 - depth ) * ${colorVec(look.glow)}; // light shines through the thin edges
          diffuseColor.rgb = mix( ${colorVec(look.edge)}, ${colorVec(look.center)}, depth );
          #ifdef USE_COLOR
            diffuseColor.rgb *= vColor.rgb;
          #endif
          diffuseColor.a = mix( ${look.opacityEdge.toFixed(3)}, ${look.opacityCenter.toFixed(3)}, depth );
          // the glossy streak of a window on the glass wall (a narrow band on the side facing the light)
          totalEmissiveRadiance += vec3( 0.34 ) * ${(look.streak ?? 1).toFixed(2)} * ( smoothstep( 0.10, 0.0, abs( normal.x - 0.5 ) ) + 0.35 * smoothstep( 0.30, 0.0, abs( normal.x - 0.5 ) ) ) * ( 1.0 - abs( normal.y ) );
          ${sparkle}
        }`
      );
    };
    material.customProgramCacheKey = () => `liquid-${key}`;
    return material;
  };
  const mats = {
    red: clearLiquid(LIQUID_LOOKS.redWine, "red"),
    white: clearLiquid(LIQUID_LOOKS.whiteWine, "white"),
    beer: clearLiquid(LIQUID_LOOKS.beer, "beer"),
    whiskey: clearLiquid(LIQUID_LOOKS.whiskey, "whiskey"),
    foam: new THREE.MeshPhysicalMaterial({ color: BEER_FOAM_COLOR, roughness: 0.9, clearcoat: 0.6, clearcoatRoughness: 0.1 }),
    coffee: clearLiquid(LIQUID_LOOKS.coffee, "coffee"),
    cream: clearLiquid(LIQUID_LOOKS.cream, "cream"),
    vodka: clearLiquid(LIQUID_LOOKS.vodka, "vodka"),
    cognac: clearLiquid(LIQUID_LOOKS.cognac, "cognac"),
    champagne: clearLiquid(LIQUID_LOOKS.champagne, "champagne"),
    tonic: clearLiquid(LIQUID_LOOKS.tonic, "tonic"),
    cocktail: clearLiquid(LIQUID_LOOKS.cocktail, "cocktail"),
    ice: clearLiquid(LIQUID_LOOKS.ice, "ice"),
  };
  const limeFace = new THREE.MeshStandardMaterial({ map: limeTexture(), roughness: 0.5 });
  const limeRind = new THREE.MeshStandardMaterial({ color: 0x3f6e16, roughness: 0.6 });
  const cherryMat = new THREE.MeshPhysicalMaterial({ color: CHERRY_COLOR, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const pickMat = new THREE.MeshStandardMaterial({ color: 0x9a7a48, roughness: 0.7 });

  /** The shapes of a full drink are made once and shared by all glasses; a glass that is drunk gets its own. */
  const full = Object.fromEntries(DRINK_KINDS.map((kind) => [kind, KINDS[kind].layers.map(([, shape]) => shape(1, 0))]));
  const iceGeometry = new RoundedBoxGeometry(1, 1, 1, 2, ICE_ROUNDING);
  const limeGeometry = new THREE.CylinderGeometry(LIME_RADIUS, LIME_RADIUS, LIME_THICKNESS, 32).rotateZ(Math.PI / 2);
  const cherryGeometry = new THREE.SphereGeometry(CHERRY_RADIUS, 20, 14);
  // the pick leans from the rim down to the cherry in the bottom of the cone
  const cherryAt = new THREE.Vector3(0, COCKTAIL_GLASS.stem + 0.022, 0);
  const pickTop = new THREE.Vector3(COCKTAIL_GLASS.bowl * 0.8, COCKTAIL_GLASS.height + 0.012, 0);
  const pickGeometry = new THREE.CylinderGeometry(PICK_RADIUS, PICK_RADIUS, pickTop.distanceTo(cherryAt), 6);

  /**
   * The ice and the lime float on the drink at `share` (0…1) and sink with it; in an empty glass
   * they lie on the bottom. The ice melts with `age` (s): it gets smaller and is gone at the end.
   */
  const placeFloating = (glass, share, age) => {
    const spec = KINDS[glass.kind];
    if (!spec.level) return;
    const level = share > 0.001 ? spec.level(share) : spec.base;
    if (glass.ice.length) {
      const { size, cubes } = ICE[glass.kind];
      const melt = Math.min(1, age / ICE_MELT_SECONDS);
      const edge = size * THREE.MathUtils.lerp(1, ICE_MELT_MIN, Math.pow(melt, 0.8));
      const layers = Math.max(...cubes.map((c) => c[2])) + 1;
      glass.ice.forEach((cube, i) => {
        const [x, z, layer] = cubes[i];
        const floating = level + edge * (0.5 - ICE_SINK) - layer * edge * 0.95;
        const lying = spec.base + edge / 2 + (layers - 1 - layer) * edge * 0.95;
        cube.position.set(x, Math.max(floating, lying), z);
        cube.scale.setScalar(edge);
        cube.visible = melt < 1;
      });
    }
    if (glass.lime) glass.lime.position.y = Math.max(level - 0.2 * LIME_RADIUS, spec.base + LIME_RADIUS);
  };

  /**
   * Build one glass with its drink (`kind`: one of DRINK_KINDS); `age` (s) is how long ago it was
   * poured (the ice of the glasses on the tables is already a little melted).
   */
  const build = (kind, age = 0) => {
    const spec = KINDS[kind];
    const g = new THREE.Group();
    const add = (geometry, material, order = 0) => {
      const m = new THREE.Mesh(geometry, material);
      m.renderOrder = order;
      g.add(m);
      return m;
    };
    add(spec.glass, glassMat, 2);
    const layers = full[kind].map((geometry, i) => add(geometry, mats[spec.layers[i][0]]));
    // the ice is drawn before the drink, so that it shows through it
    const ice = (ICE[kind]?.cubes ?? []).map((_, i) => {
      const cube = add(iceGeometry, mats.ice, -1);
      cube.rotation.set(0.08 * (i % 2 ? 1 : -1), [0.35, 1.2, 0.8, 0.15][i % 4], 0.06 * (i % 3 - 1));
      return cube;
    });
    let lime = null;
    if (spec.lime) {
      lime = add(limeGeometry, [limeRind, limeFace, limeFace]);
      lime.position.x = HIGHBALL_GLASS_RADIUS_BOTTOM * 0.53; // upright, close to the wall
    }
    if (spec.cherry) {
      add(cherryGeometry, cherryMat).position.copy(cherryAt);
      const pick = add(pickGeometry, pickMat);
      pick.position.lerpVectors(cherryAt, pickTop, 0.5);
      pick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pickTop.clone().sub(cherryAt).normalize());
    }
    const glass = { group: g, radius: spec.radius, kind, layers, ice, lime };
    placeFloating(glass, 1, age);
    return glass;
  };

  /** A glass with a level (share 1 = full … 0 = empty), sips left, and an age: the beer foam falls apart, the ice melts. */
  function makePlayerGlass(initial) {
    let glass = initial;
    const state = {
      group: glass.group,
      kind: glass.kind,
      share: 1,
      sipsLeft: DRINK_SIPS,
      age: 0,
      rest: { position: glass.group.position.clone(), quaternion: glass.group.quaternion.clone() },
      /** There is still ice in the glass (it clinks). */
      hasIce: () => glass.ice.length > 0 && state.age < ICE_MELT_SECONDS,
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
        next.group.visible = state.group.visible; // (a seat that is not taken stays empty)
        group.remove(state.group);
        group.add(next.group);
        disposeOwn();
        glass = next;
        Object.assign(state, { group: next.group, kind, share: 1, sipsLeft: DRINK_SIPS, age: 0 });
        refresh();
      },
      /** Per frame: the foam decays (rebuilt a few times per second only), the ice melts. */
      update(dt) {
        state.age += dt;
        if (glass.kind === "beer" && state.share > 0 && state.age - dt < BEER_FOAM_DECAY_SECONDS) {
          sinceRebuild += dt;
          if (sinceRebuild > 0.5) refresh();
        }
        if (glass.ice.length && state.age - dt < ICE_MELT_SECONDS) placeFloating(glass, state.share, state.age);
      },
    };
    let sinceRebuild = 0;
    /** The shapes made for this glass alone are freed (the shared full ones stay). */
    const disposeOwn = () => glass.layers.forEach((m, i) => m.geometry !== full[glass.kind][i] && m.geometry.dispose());
    const refresh = () => {
      sinceRebuild = 0;
      const empty = state.share <= 0.001;
      for (const m of glass.layers) m.visible = !empty;
      placeFloating(glass, state.share, state.age);
      if (empty) return;
      disposeOwn();
      KINDS[glass.kind].layers.forEach(([, shape], i) => (glass.layers[i].geometry = shape(state.share, state.age)));
    };
    return state;
  }

  /** A drink for a round table, by GLASSES_KIND_WEIGHTS. */
  const randomKind = () => {
    let r = rnd();
    for (const kind of DRINK_KINDS) {
      r -= GLASSES_KIND_WEIGHTS[kind] ?? 0;
      if (r < 0) return kind;
    }
    return "beer";
  };

  // Round tables: random drinks at free spots on the plate
  const occupied = taken.map((o) => ({ ...o }));
  for (const table of FURNITURE_TABLES) {
    const count = GLASSES_PER_TABLE[Math.floor(rnd() * GLASSES_PER_TABLE.length)];
    for (let n = 0; n < count; n++) {
      const glass = build(randomKind(), rnd() * 0.6 * ICE_MELT_SECONDS);
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
  const drinks = [...DRINK_KINDS].sort(() => Math.random() - 0.5).slice(0, 2);
  /** The players' glasses: they can be drunk from (the level falls) and their foam falls apart. */
  const seats = [-1, 1].map((sz, i) => {
    const glass = build(drinks[i]);
    glass.group.position.set(frameX, frameTop, sz * GLASSES_FRAME_Z);
    group.add(glass.group);
    const state = makePlayerGlass(glass);
    state.side = i; // 0 on the −z half, 1 on the +z half of the frame
    return state;
  });
  const player = [...seats]; // the glasses of the seats that are taken
  const carried = []; // the glasses in the hands of guests without a seat: invisible, unless he drinks

  scene.add(group);
  return {
    group,
    /** Everything standing on the round tables so far (for what comes next). */
    taken: occupied,
    /** A new glass with a drink (`kind` and `age` like in build): `{ group, radius, kind }` (for the bar). */
    makeGlass: build,
    /** The two players' glasses on the frame of the billard table. */
    player,
    /** A glass in the hand of a guest without a seat (`kind` like in build): invisible; the hand shows it while he drinks (`carried: true`, `rest` is set by the hand). */
    makeCarriedGlass(kind) {
      const glass = build(kind);
      glass.group.visible = false;
      group.add(glass.group);
      const state = makePlayerGlass(glass);
      state.carried = true;
      state.side = -1;
      carried.push(state);
      return state;
    },
    /** A guest with a glass in the hand leaves. */
    removeCarriedGlass(state) {
      group.remove(state.group);
      carried.splice(carried.indexOf(state), 1);
    },
    /** The glass of a seat (`side` 0 on the −z half, 1 on the +z half) as a state: kind, sipsLeft, … */
    seat(side) {
      return seats[side];
    },
    /** The glass of a seat shows what the guest on it has: this drink and this many sips left (of DRINK_SIPS). */
    setSeatGlass(side, kind, sips) {
      const g = seats[side];
      if (g.kind !== kind) g.replace(kind);
      g.sipsLeft = sips;
      g.setShare(sips / DRINK_SIPS);
    },
    /** The glass of a seat (`side` 0 on the −z half, 1 on the +z half) stands on the table only while the seat is taken. */
    setSeat(side, present) {
      seats[side].group.visible = present;
      player.length = 0;
      player.push(...seats.filter((g) => g.group.visible));
    },
    update(dt) {
      liquidTime.value += dt;
      for (const g of player) g.update(dt);
      for (const g of carried) g.update(dt); // (the ice in the hand melts too)
    },
    /** Let the glass reflect the room (call after the room reflection was captured). */
    applyReflection(reflection) {
      for (const m of [glassMat, ...Object.values(mats).filter((m) => m !== mats.foam)]) {
        // the reflection patches the shader too: the material's own patch (the whiskey's depth) stays
        const [own, ownKey] = [m.onBeforeCompile, m.customProgramCacheKey.bind(m)];
        applyBallReflection(m, reflection, { clearGlass: true }); // the drinks are glossy and see-through too
        const [patch, patchKey] = [m.onBeforeCompile, m.customProgramCacheKey.bind(m)];
        m.onBeforeCompile = (shader, renderer) => {
          patch.call(m, shader, renderer);
          own.call(m, shader, renderer);
        };
        m.customProgramCacheKey = () => `${patchKey()}|${ownKey()}`;
        m.envMapIntensity = 1.6;
      }
    },
  };
}
