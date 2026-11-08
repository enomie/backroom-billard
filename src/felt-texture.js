/**
 * The skin of the cloth: a color texture and a roughness texture for the whole playing surface (one
 * pixel is about 2.5 mm), made once from felt-constants.js: the worn head spot and the faint water
 * stains. The textures are laid over the cloth by its position (u = x, v = z in meters, see
 * table-blueprint.js).
 */
import * as THREE from "three";
import {
  FELT_TEXTURE_WIDTH as W,
  FELT_TEXTURE_HEIGHT as H,
  FELT_COLOR,
  FELT_NAP_NOISE,
  FELT_ROUGHNESS,
  FELT_WEAR,
  FELT_STAINS,
  FELT_STAIN_LIFT_COLOR,
  FELT_STAIN_ROUGHNESS,
} from "./felt-constants.js";

/** Smooth value noise in 0..1 at a point (x, y), the same every time. */
function noise(x, y, seed) {
  const hash = (i, j) => {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const [x0, y0] = [Math.floor(x), Math.floor(y)];
  const [fx, fy] = [x - x0, y - y0];
  const [sx, sy] = [fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)];
  const top = hash(x0, y0) * (1 - sx) + hash(x0 + 1, y0) * sx;
  const bottom = hash(x0, y0 + 1) * (1 - sx) + hash(x0 + 1, y0 + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * @param {{ minX: number, maxX: number, minZ: number, maxZ: number }} bounds — the cloth in meters
 * @returns {{ map: THREE.CanvasTexture, roughnessMap: THREE.CanvasTexture }} (u, v already set up)
 */
export function feltTextures(bounds) {
  const width = bounds.maxX - bounds.minX;
  const length = bounds.maxZ - bounds.minZ;
  const color = document.createElement("canvas");
  const rough = document.createElement("canvas");
  color.width = rough.width = W;
  color.height = rough.height = H;
  const colorImage = color.getContext("2d").createImageData(W, H);
  const roughImage = rough.getContext("2d").createImageData(W, H);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const x = bounds.minX + ((px + 0.5) / W) * width;
      const z = bounds.maxZ - ((py + 0.5) / H) * length; // the top row is the head end (+z)
      const rgb = [...FELT_COLOR];
      let roughness = FELT_ROUGHNESS;

      // the worn head spot: an uneven edge, a mottled inside
      const wear = FELT_WEAR;
      const d = Math.hypot(x - wear.x, z - wear.z);
      const edge = wear.radius * (0.75 + 0.5 * noise(x * 7, z * 7, 1));
      const mottle = 0.8 + 0.4 * noise(x * 40, z * 40, 2);
      const w = wear.strength * (1 - smooth(edge * 0.35, edge * 1.6, d)) * mottle;
      for (let k = 0; k < 3; k++) rgb[k] = mix(rgb[k], wear.color[k], w);
      roughness = mix(roughness, wear.roughness, Math.min(1, w / wear.strength));

      // the water stains
      for (const [i, stain] of FELT_STAINS.entries()) {
        const t = Math.hypot(x - stain.x, z - stain.z) / (stain.radius * (0.75 + 0.5 * noise(x * 9, z * 9, 10 + i)));
        const lift = stain.lift * (1 - smooth(0.55, 1, t)) * (0.7 + 0.6 * noise(x * 30, z * 30, 20 + i));
        const rim = stain.rim * Math.exp(-(((t - 1) / 0.09) ** 2)) * (0.5 + 0.8 * noise(x * 60, z * 60, 30 + i));
        for (let k = 0; k < 3; k++) rgb[k] = mix(mix(rgb[k], FELT_STAIN_LIFT_COLOR[k], lift), stain.rimColor[k], rim);
        roughness = mix(roughness, FELT_STAIN_ROUGHNESS, Math.min(1, lift / stain.lift) * (1 - smooth(0.9, 1.2, t)));
      }

      const nap = (noise(x * 300, z * 300, 3) - 0.5) * 2 * FELT_NAP_NOISE;
      const i = (py * W + px) * 4;
      colorImage.data[i] = rgb[0] + nap;
      colorImage.data[i + 1] = rgb[1] + nap;
      colorImage.data[i + 2] = rgb[2] + nap;
      colorImage.data[i + 3] = 255;
      roughImage.data[i] = roughImage.data[i + 1] = roughImage.data[i + 2] = Math.round(roughness * 255);
      roughImage.data[i + 3] = 255;
    }
  }
  color.getContext("2d").putImageData(colorImage, 0, 0);
  rough.getContext("2d").putImageData(roughImage, 0, 0);

  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  const roughnessMap = new THREE.CanvasTexture(rough);
  roughnessMap.colorSpace = THREE.NoColorSpace; // data, not a color
  for (const texture of [map, roughnessMap]) {
    texture.anisotropy = 8;
    // the cloth's texture coordinates are meters: scale and shift them onto 0..1
    texture.repeat.set(1 / width, 1 / length);
    texture.offset.set(-bounds.minX / width, -bounds.minZ / length);
  }
  return { map, roughnessMap };
}
