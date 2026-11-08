/**
 * The skin of a ball: its color with small specks scattered over the whole surface (inclusions, as
 * in ivory), a different pattern for every ball. One canvas texture per ball, made once and kept.
 * See ball-constants.js.
 */
import * as THREE from "three";
import {
  BALL_TEXTURE_WIDTH as W,
  BALL_TEXTURE_HEIGHT as H,
  BALL_SPECK_COUNT,
  BALL_SPECK_RADIUS_MIN,
  BALL_SPECK_RADIUS_MAX,
  BALL_SPECK_STRENGTH_MIN,
  BALL_SPECK_STRENGTH_MAX,
  BALL_SPECK_COLOR_ON_LIGHT,
  BALL_SPECK_COLOR_ON_DARK,
  BALL_DARK_LIMIT,
} from "./ball-constants.js";

/** Small seeded random generator: every ball keeps its pattern from one start to the next. */
function random(seed) {
  let s = (seed * 2654435761 + 1013904223) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const textures = new Map();

/**
 * @param {number} colorHex — the color of the ball
 * @param {number} id — the ball (its pattern)
 * @returns {THREE.CanvasTexture}
 */
export function ballTexture(colorHex, id) {
  if (textures.has(id)) return textures.get(id);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const base = [(colorHex >> 16) & 255, (colorHex >> 8) & 255, colorHex & 255];
  ctx.fillStyle = `rgb(${base.join(",")})`;
  ctx.fillRect(0, 0, W, H);

  const luminance = (0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2]) / 255;
  const speck = luminance < BALL_DARK_LIMIT ? BALL_SPECK_COLOR_ON_DARK : BALL_SPECK_COLOR_ON_LIGHT;
  const rnd = random(id + 1);
  for (let i = 0; i < BALL_SPECK_COUNT; i++) {
    // a point spread evenly over the sphere, as longitude (x) and latitude (y) on the texture
    const lat = Math.asin(2 * rnd() - 1);
    const x = rnd() * W;
    const y = (0.5 - lat / Math.PI) * H;
    const radius = BALL_SPECK_RADIUS_MIN + (BALL_SPECK_RADIUS_MAX - BALL_SPECK_RADIUS_MIN) * rnd() ** 2;
    const stretch = 1 / Math.max(0.2, Math.cos(lat)); // the texture is wider than the sphere towards the poles
    const strength = BALL_SPECK_STRENGTH_MIN + (BALL_SPECK_STRENGTH_MAX - BALL_SPECK_STRENGTH_MIN) * rnd();
    ctx.fillStyle = `rgb(${base.map((c, k) => Math.round(c * (1 - strength) + speck[k] * strength)).join(",")})`;
    for (const dx of [-W, 0, W]) {
      // copies across the seam, so a speck at the edge continues on the other side
      ctx.beginPath();
      ctx.ellipse(x + dx, y, radius * stretch, radius, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  textures.set(id, texture);
  return texture;
}
