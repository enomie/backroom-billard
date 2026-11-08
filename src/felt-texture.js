/**
 * The skin of the cloth: a color texture and a roughness texture for the whole playing surface (one
 * pixel is about 2.5 mm), made once from felt-constants.js: the worn head spot (hole and washed-out place) and the faint water
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
  FELT_WASH,
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

/** A fixed random number 0..1 for a seed. */
const phase = (seed) => noise(seed * 7.31, seed * 3.17, 99);

/**
 * How far a point is from the edge of a lumpy, long blob: 1 = on the edge, less inside. The outline
 * swells and narrows with a few waves around the blob (the lumps), and a fine unevenness is added.
 * @param {{ x: number, z: number, radius: number, aspect?: number, rotation?: number, lobes?: number }} blob
 * @returns {{ t: number, angle: number }}
 */
function blobEdge(x, z, blob, seed) {
  const [dx, dz] = [x - blob.x, z - blob.z];
  const [c, s] = [Math.cos(blob.rotation ?? 0), Math.sin(blob.rotation ?? 0)];
  const stretch = Math.sqrt(blob.aspect ?? 1);
  const [u, v] = [((dx * c + dz * s) / stretch), (-dx * s + dz * c) * stretch];
  const angle = Math.atan2(v, u);
  let wave = 0;
  for (const [k, weight] of [[2, 0.55], [3, 0.5], [4, 0.3], [5, 0.16]]) wave += weight * Math.cos(k * angle + phase(seed + k) * 6.283);
  const edge = blob.radius * (1 + (blob.lobes ?? 0) * wave);
  const fine = (noise(x * 45, z * 45, seed) - 0.5) * 0.12;
  return { t: Math.hypot(u, v) / edge + fine, angle };
}

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

      // the head spot: a washed-out, flattened place, and in it the small hole where the cloth is worn through
      const wash = FELT_WASH;
      const { t: st } = blobEdge(x, z, wash, 2);
      const flat = wash.strength * (1 - smooth(0.3, 1.2, st)) * (0.75 + 0.5 * noise(x * 38, z * 38, 4));
      for (let k = 0; k < 3; k++) rgb[k] = mix(rgb[k], wash.color[k], flat);
      roughness = mix(roughness, wash.roughness, Math.min(1, flat / wash.strength));
      const wear = FELT_WEAR;
      const { t: wt } = blobEdge(x, z, wear, 1);
      const hole = wear.strength * (1 - smooth(0.82, 1, wt)); // a short, slightly frayed edge
      for (let k = 0; k < 3; k++) rgb[k] = mix(rgb[k], wear.color[k], hole);
      roughness = mix(roughness, wear.roughness, hole);

      // the water stains
      for (const [i, stain] of FELT_STAINS.entries()) {
        const { t, angle } = blobEdge(x, z, stain, 10 + i * 10);
        const lift = stain.lift * (1 - smooth(0.5, 1, t)) * (0.6 + 0.8 * noise(x * 28, z * 28, 20 + i));
        // the edge ring: strong in places, missing in others; a fainter one inside
        const along = Math.max(0, noise(Math.cos(angle) * 2.2 + i * 5, Math.sin(angle) * 2.2, 30 + i) * 1.6 - 0.25);
        const ring = stain.rim * (Math.exp(-(((t - 1) / 0.07) ** 2)) + 0.4 * Math.exp(-(((t - 0.62) / 0.06) ** 2))) * along;
        for (let k = 0; k < 3; k++) rgb[k] = mix(mix(rgb[k], FELT_STAIN_LIFT_COLOR[k], lift), stain.rimColor[k], Math.min(1, ring));
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
