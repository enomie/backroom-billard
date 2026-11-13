/**
 * The skin of a ball: its color (solid, or a band on ivory for a stripe), small specks scattered over
 * the whole surface (inclusions, as in ivory; a different pattern for every ball) and its number in a
 * white circle on two opposite sides. One canvas texture per ball, made once and kept; drawn again once
 * the font of the numbers has loaded. See ball-constants.js.
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
  BALL_STRIPE_HALF_ANGLE,
  BALL_NUMBER_CIRCLE_ANGLE,
  BALL_NUMBER_SIZE,
  BALL_NUMBER_FONT,
  BALL_NUMBER_UNDERLINE,
  BALL_NUMBER_COLOR,
  BALL_IVORY,
  CUE_BALL_COLOR,
  ballColor,
  isStripe,
} from "./ball-constants.js";
import { seededRandom } from "./math-utils.js";

const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const css = (c) => `rgb(${c.join(",")})`;
/** Latitude (radians, north up) to texture y. */
const latToY = (lat) => (0.5 - lat / Math.PI) * H;

/** The number circle around (longitude lon0, equator) as a path on the texture (round on the sphere). */
function circlePath(ctx, lon0) {
  const a = BALL_NUMBER_CIRCLE_ANGLE;
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const bearing = (i / 64) * Math.PI * 2;
    const lat = Math.asin(Math.sin(a) * Math.cos(bearing));
    const lon = lon0 + Math.atan2(Math.sin(bearing) * Math.sin(a), Math.cos(a));
    ctx.lineTo((lon / (Math.PI * 2)) * W, latToY(lat));
  }
  ctx.closePath();
}

/** Draw the whole skin of a ball (0 = cue ball, 1–15). */
function paint(ctx, id) {
  const stripe = isStripe(id);
  const color = rgb(id === 0 ? CUE_BALL_COLOR : ballColor(id));
  const ivory = rgb(BALL_IVORY);
  ctx.fillStyle = css(stripe ? ivory : color);
  ctx.fillRect(0, 0, W, H);
  if (stripe) {
    ctx.fillStyle = css(color);
    ctx.fillRect(0, latToY(BALL_STRIPE_HALF_ANGLE), W, latToY(-BALL_STRIPE_HALF_ANGLE) - latToY(BALL_STRIPE_HALF_ANGLE));
  }

  const rnd = seededRandom(id + 1);
  for (let i = 0; i < BALL_SPECK_COUNT; i++) {
    // a point spread evenly over the sphere, as longitude (x) and latitude (y) on the texture
    const lat = Math.asin(2 * rnd() - 1);
    const x = rnd() * W;
    const y = latToY(lat);
    const radius = BALL_SPECK_RADIUS_MIN + (BALL_SPECK_RADIUS_MAX - BALL_SPECK_RADIUS_MIN) * rnd() ** 2;
    const stretch = 1 / Math.max(0.2, Math.cos(lat)); // the texture is wider than the sphere towards the poles
    const strength = BALL_SPECK_STRENGTH_MIN + (BALL_SPECK_STRENGTH_MAX - BALL_SPECK_STRENGTH_MIN) * rnd();
    const under = stripe && Math.abs(lat) > BALL_STRIPE_HALF_ANGLE ? ivory : color;
    const luminance = (0.2126 * under[0] + 0.7152 * under[1] + 0.0722 * under[2]) / 255;
    const speck = luminance < BALL_DARK_LIMIT ? BALL_SPECK_COLOR_ON_DARK : BALL_SPECK_COLOR_ON_LIGHT;
    ctx.fillStyle = css(under.map((c, k) => Math.round(c * (1 - strength) + speck[k] * strength)));
    for (const dx of [-W, 0, W]) {
      // copies across the seam, so a speck at the edge continues on the other side
      ctx.beginPath();
      ctx.ellipse(x + dx, y, radius * stretch, radius, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (id === 0) return;
  const diameter = latToY(-BALL_NUMBER_CIRCLE_ANGLE) - latToY(BALL_NUMBER_CIRCLE_ANGLE);
  for (const lon0 of [Math.PI / 2, (Math.PI * 3) / 2]) {
    // the two circles sit on the equator, away from the seam; there the texture is not stretched
    circlePath(ctx, lon0);
    ctx.fillStyle = css(ivory);
    ctx.fill();
    const x = (lon0 / (Math.PI * 2)) * W;
    ctx.fillStyle = BALL_NUMBER_COLOR;
    ctx.font = BALL_NUMBER_FONT.replace("{size}", String(Math.round(diameter * BALL_NUMBER_SIZE)));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(id), x, H / 2 + diameter * 0.03);
    if (id === 6 || id === 9) {
      const u = BALL_NUMBER_UNDERLINE;
      ctx.fillRect(x - (diameter * u.width) / 2, H / 2 + diameter * u.offset - (diameter * u.height) / 2, diameter * u.width, diameter * u.height);
    }
  }
}

const textures = new Map();

/**
 * @param {number} id — the ball: 0 = cue ball, otherwise its number
 * @returns {THREE.CanvasTexture}
 */
export function ballTexture(id) {
  if (textures.has(id)) return textures.get(id);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  paint(ctx, id);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  textures.set(id, texture);
  if (id > 0) {
    // until the font is there the canvas draws the numbers in a fallback font
    document.fonts.load(BALL_NUMBER_FONT.replace("{size}", "40")).then(() => {
      paint(ctx, id);
      texture.needsUpdate = true;
    });
  }
  return texture;
}
