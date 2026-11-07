/**
 * Wine and beer bottles: dark glass solids of revolution with a paper label, a foil capsule
 * (wine) or crown cap (beer). They stand on some of the round tables, clear of other things.
 */
import * as THREE from "three";
import { FURNITURE_TABLES, FURNITURE_TABLE_HEIGHT, FURNITURE_TABLE_RADIUS } from "./furniture-constants.js";
import {
  WINE_BOTTLE_HEIGHT,
  WINE_BOTTLE_RADIUS,
  WINE_BOTTLE_SHOULDER_START,
  WINE_BOTTLE_SHOULDER_END,
  WINE_BOTTLE_NECK_RADIUS,
  WINE_BOTTLE_COLOR,
  WINE_BOTTLE_OPACITY,
  WINE_CAPSULE_COLOR,
  WINE_LABEL_BOTTOM,
  WINE_LABEL_HEIGHT,
  BEER_BOTTLE_HEIGHT,
  BEER_BOTTLE_RADIUS,
  BEER_BOTTLE_SHOULDER_START,
  BEER_BOTTLE_SHOULDER_END,
  BEER_BOTTLE_NECK_RADIUS,
  BEER_BOTTLE_COLOR,
  BEER_BOTTLE_OPACITY,
  BEER_CAP_COLOR,
  BEER_LABEL_BOTTOM,
  BEER_LABEL_HEIGHT,
  BOTTLE_TABLE_SHARE,
  BOTTLE_WINE_SHARE,
  BOTTLE_RING_MIN,
  BOTTLE_RING_MAX,
  BOTTLE_SEED,
} from "./bottles-constants.js";
import { applyBallReflection } from "./ball-reflection.js";

/** Bottle outline: round bottom, straight body, smooth shoulder to the neck, ring at the mouth. */
function bottleGeometry({ height, radius, shoulderStart, shoulderEnd, neck }) {
  const pts = [[0, 0], [radius - 0.005, 0], [radius - 0.001, 0.002], [radius, 0.007], [radius, shoulderStart]];
  const n = 12;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const k = 0.5 - 0.5 * Math.cos(Math.PI * t); // smooth S-curve from body to neck
    pts.push([THREE.MathUtils.lerp(radius, neck, k), THREE.MathUtils.lerp(shoulderStart, shoulderEnd, t)]);
  }
  const lip = neck + 0.003;
  pts.push([neck, height - 0.014], [lip, height - 0.011], [lip, height - 0.003], [neck, height - 0.001], [0, height - 0.001]);
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64);
}

/** Label: a strip around the front of the body (about 140°), facing +z. */
function labelGeometry(radius, bottom, height) {
  const arc = 2.4;
  const g = new THREE.CylinderGeometry(radius + 0.0004, radius + 0.0004, height, 32, 1, true, -arc / 2, arc);
  g.translate(0, bottom + height / 2, 0);
  return g;
}

/** Label art: fictional names, no real brands. */
function labelTexture(kind) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d");
  const wine = kind === "wine";
  ctx.fillStyle = wine ? "#efe6cf" : "#d9b648";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = wine ? "#7a1a22" : "#5a2a0a";
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.fillStyle = wine ? "#5a0c18" : "#3a1c08";
  ctx.textAlign = "center";
  ctx.font = wine ? "italic 44px serif" : "bold 50px serif";
  ctx.fillText(wine ? "Château Backroom" : "BACKROOM", c.width / 2, 78);
  ctx.font = wine ? "26px serif" : "bold 28px serif";
  ctx.fillText(wine ? "Grand Cru · 1984" : "Original Lager", c.width / 2, 124);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
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
 * @param {{ x: number, z: number, r: number }[]} taken — objects already on the tables
 * @returns {{ group: THREE.Group, applyReflection: (reflection: object) => void }}
 */
export function createBottles(scene, taken) {
  const group = new THREE.Group();
  group.name = "bottles";
  const rnd = random(BOTTLE_SEED);

  const glass = (color, opacity) =>
    new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false });
  const mats = { wine: glass(WINE_BOTTLE_COLOR, WINE_BOTTLE_OPACITY), beer: glass(BEER_BOTTLE_COLOR, BEER_BOTTLE_OPACITY) };
  const label = (kind) => new THREE.MeshStandardMaterial({ map: labelTexture(kind), roughness: 0.8, side: THREE.FrontSide });
  const foil = new THREE.MeshStandardMaterial({ color: WINE_CAPSULE_COLOR, roughness: 0.35, metalness: 0.6 });
  const cap = new THREE.MeshStandardMaterial({ color: BEER_CAP_COLOR, roughness: 0.35, metalness: 0.8 });

  const kinds = {
    wine: {
      radius: WINE_BOTTLE_RADIUS,
      glass: bottleGeometry({ height: WINE_BOTTLE_HEIGHT, radius: WINE_BOTTLE_RADIUS, shoulderStart: WINE_BOTTLE_SHOULDER_START, shoulderEnd: WINE_BOTTLE_SHOULDER_END, neck: WINE_BOTTLE_NECK_RADIUS }),
      label: labelGeometry(WINE_BOTTLE_RADIUS, WINE_LABEL_BOTTOM, WINE_LABEL_HEIGHT),
      labelMat: label("wine"),
      // foil capsule over the mouth and the top of the neck
      top: new THREE.CylinderGeometry(WINE_BOTTLE_NECK_RADIUS + 0.0035, WINE_BOTTLE_NECK_RADIUS + 0.0035, 0.05, 24).translate(0, WINE_BOTTLE_HEIGHT - 0.025, 0),
      topMat: foil,
    },
    beer: {
      radius: BEER_BOTTLE_RADIUS,
      glass: bottleGeometry({ height: BEER_BOTTLE_HEIGHT, radius: BEER_BOTTLE_RADIUS, shoulderStart: BEER_BOTTLE_SHOULDER_START, shoulderEnd: BEER_BOTTLE_SHOULDER_END, neck: BEER_BOTTLE_NECK_RADIUS }),
      label: labelGeometry(BEER_BOTTLE_RADIUS, BEER_LABEL_BOTTOM, BEER_LABEL_HEIGHT),
      labelMat: label("beer"),
      // crown cap: a short disc, slightly wider than the mouth
      top: new THREE.CylinderGeometry(BEER_BOTTLE_NECK_RADIUS + 0.0065, BEER_BOTTLE_NECK_RADIUS + 0.0065, 0.006, 24).translate(0, BEER_BOTTLE_HEIGHT - 0.001, 0),
      topMat: cap,
    },
  };

  const occupied = taken.map((o) => ({ ...o }));
  for (const table of FURNITURE_TABLES) {
    if (rnd() > BOTTLE_TABLE_SHARE) continue;
    const kind = rnd() < BOTTLE_WINE_SHARE ? "wine" : "beer";
    const k = kinds[kind];
    for (let attempt = 0; attempt < 16; attempt++) {
      const angle = rnd() * Math.PI * 2;
      const ring = BOTTLE_RING_MIN + rnd() * (BOTTLE_RING_MAX - BOTTLE_RING_MIN);
      const x = table.x + Math.cos(angle) * ring;
      const z = table.z + Math.sin(angle) * ring;
      const fits = ring + k.radius < FURNITURE_TABLE_RADIUS - 0.02 &&
        occupied.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + k.radius + 0.01);
      if (!fits) continue;
      const bottle = new THREE.Group();
      const body = new THREE.Mesh(k.glass, mats[kind]);
      body.renderOrder = 2;
      bottle.add(body, new THREE.Mesh(k.label, k.labelMat), new THREE.Mesh(k.top, k.topMat));
      bottle.position.set(x, FURNITURE_TABLE_HEIGHT, z);
      bottle.rotation.y = rnd() * Math.PI * 2; // label turned at random
      group.add(bottle);
      occupied.push({ x, z, r: k.radius });
      break;
    }
  }

  scene.add(group);
  return {
    group,
    /** Let the glass reflect the room (call after the room reflection was captured). */
    applyReflection(reflection) {
      for (const m of Object.values(mats)) {
        applyBallReflection(m, reflection, { clearGlass: true });
        m.envMapIntensity = 1.6;
      }
    },
  };
}
