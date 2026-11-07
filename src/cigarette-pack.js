/**
 * Flip-top cigarette pack with 20 cigarettes (7 – 6 – 7, filters up), closed or with the lid
 * swung open. Lies on some of the round tables and on the billard table's frame. The brand is
 * made up. See _docs/cigarettes.md.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FURNITURE_TABLES, FURNITURE_TABLE_HEIGHT, FURNITURE_TABLE_RADIUS } from "./furniture-constants.js";
import { PLAY_W, TABLE_H, CUSHION_NOSE_TO_BED, CUSHION_PROFILE_WIDTH, RAIL_WOOD_DEPTH } from "./table-constants.js";
import {
  CIGARETTE_LENGTH,
  CIGARETTE_DIAMETER,
  CIGARETTE_FILTER_LENGTH,
  CIGARETTE_COLOR_PAPER,
  CIGARETTE_COLOR_FILTER,
  PACK_WIDTH,
  PACK_DEPTH,
  PACK_HEIGHT,
  PACK_LID_HEIGHT,
  PACK_CARDBOARD,
  PACK_LID_OPEN_ANGLE,
  PACK_COLOR,
  PACK_TABLE_SHARE,
  PACK_OPEN_SHARE,
  PACK_RING_MIN,
  PACK_RING_MAX,
  PACK_FRAME_Z,
  PACK_SEED,
} from "./cigarette-constants.js";

const W = PACK_WIDTH;
const D = PACK_DEPTH;
const H = PACK_HEIGHT;
const T = PACK_CARDBOARD;
const LID = PACK_LID_HEIGHT;
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

/** Front art: black card with gold lines and a red band. Invented brand. */
function frontTexture() {
  const c = document.createElement("canvas");
  c.width = 232;
  c.height = 352;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#17120f";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#8c1a22"; // red band
  ctx.fillRect(0, 150, c.width, 92);
  ctx.strokeStyle = "#d4a84a";
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, c.width - 24, c.height - 24);
  ctx.beginPath();
  ctx.moveTo(12, 150);
  ctx.lineTo(c.width - 12, 150);
  ctx.moveTo(12, 242);
  ctx.lineTo(c.width - 12, 242);
  ctx.stroke();
  ctx.fillStyle = "#e0b85a";
  ctx.textAlign = "center";
  ctx.font = "bold 36px serif";
  ctx.fillText("BACKROOM", c.width / 2, 208);
  ctx.font = "italic 20px serif";
  ctx.fillText("Premium Blend", c.width / 2, 100);
  ctx.font = "bold 22px serif";
  ctx.fillText("No. 20", c.width / 2, 300);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A slice of the front art as its own texture (the lid and the body each show their part). */
function slice(texture, fromBottom, share) {
  const t = texture.clone();
  t.needsUpdate = true;
  t.repeat.set(1, share);
  t.offset.set(0, fromBottom);
  return t;
}

/** The 20 cigarettes of a full pack as two merged shapes (paper and filters), shared by all packs. */
function cigaretteGeometries() {
  const paper = [];
  const filter = [];
  const pitch = CIGARETTE_DIAMETER;
  const rowStep = pitch * Math.sin(Math.PI / 3);
  const rows = [[7, rowStep], [6, 0], [7, -rowStep]];
  const paperLen = CIGARETTE_LENGTH - CIGARETTE_FILTER_LENGTH;
  const y0 = 0.002; // cigarettes stand slightly above the pack's floor
  for (const [count, z] of rows) {
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * pitch;
      paper.push(new THREE.CylinderGeometry(R * 0.97, R * 0.97, paperLen, 12).translate(x, y0 + paperLen / 2, z));
      filter.push(new THREE.CylinderGeometry(R * 0.97, R * 0.97, CIGARETTE_FILTER_LENGTH, 12).translate(x, y0 + paperLen + CIGARETTE_FILTER_LENGTH / 2, z));
    }
  }
  return { paper: mergeGeometries(paper), filter: mergeGeometries(filter) };
}

/**
 * @param {THREE.Scene} scene
 * @param {{ x: number, z: number, r: number }[]} taken — objects already on the tables
 * @returns {{ group: THREE.Group }}
 */
export function createCigarettePacks(scene, taken) {
  const group = new THREE.Group();
  group.name = "cigarette-packs";
  const rnd = random(PACK_SEED);

  const front = frontTexture();
  const cardMat = new THREE.MeshStandardMaterial({ color: PACK_COLOR, roughness: 0.6 });
  const bodyFrontMat = new THREE.MeshStandardMaterial({ map: slice(front, 0, (H - LID) / H), roughness: 0.55 });
  const lidFrontMat = new THREE.MeshStandardMaterial({ map: slice(front, (H - LID) / H, LID / H), roughness: 0.55 });
  const paperMat = new THREE.MeshStandardMaterial({ color: CIGARETTE_COLOR_PAPER, roughness: 0.85 });
  const filterMat = new THREE.MeshStandardMaterial({ color: CIGARETTE_COLOR_FILTER, roughness: 0.8 });
  const cigs = cigaretteGeometries();

  const plate = (sx, sy, sz, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    return m;
  };

  /** One pack, standing upright (y up, front = +z), origin at the middle of its bottom. */
  const buildPack = (open) => {
    const pack = new THREE.Group();
    // body: floor, back, sides (inset, so the lid fits over them), front up to the lid
    pack.add(
      plate(W - 2 * T, T, D - 2 * T, 0, T / 2, 0, cardMat),
      plate(W - 2 * T, H, T, 0, H / 2, -D / 2 + T / 2, cardMat),
      plate(T, H, D - T, -W / 2 + 1.5 * T, H / 2, T / 2 - T, cardMat),
      plate(T, H, D - T, W / 2 - 1.5 * T, H / 2, T / 2 - T, cardMat),
      plate(W - 2 * T, H - LID, T, 0, (H - LID) / 2, D / 2 - T / 2, bodyFrontMat)
    );
    const paper = new THREE.Mesh(cigs.paper, paperMat);
    const filter = new THREE.Mesh(cigs.filter, filterMat);
    pack.add(paper, filter);

    // lid: front, top and sides, hinged at the top of the back
    const lid = new THREE.Group();
    lid.position.set(0, H, -D / 2);
    lid.add(
      plate(W, LID, T, 0, -LID / 2, D - T / 2, lidFrontMat),
      plate(W, T, D, 0, -T / 2, D / 2, cardMat),
      plate(T, LID, D, -W / 2 + T / 2, -LID / 2, D / 2, cardMat),
      plate(T, LID, D, W / 2 - T / 2, -LID / 2, D / 2, cardMat)
    );
    lid.rotation.x = open ? -PACK_LID_OPEN_ANGLE : 0;
    pack.add(lid);
    return pack;
  };

  /** Lay the pack on its back: its front looks up, its top end points along `yaw`. */
  const lay = (pack, x, y, z, yaw) => {
    const holder = new THREE.Group();
    pack.rotation.x = -Math.PI / 2;
    holder.add(pack);
    pack.position.z = H / 2; // centre the pack on the spot (it extends along −z once laid down)
    holder.position.set(x, y + D / 2, z);
    holder.rotation.y = yaw;
    group.add(holder);
  };

  const footprint = Math.hypot(W, H) / 2;
  const occupied = taken.map((o) => ({ ...o }));
  for (const table of FURNITURE_TABLES) {
    if (rnd() > PACK_TABLE_SHARE) continue;
    const open = rnd() < PACK_OPEN_SHARE;
    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = rnd() * Math.PI * 2;
      const ring = PACK_RING_MIN + rnd() * (PACK_RING_MAX - PACK_RING_MIN);
      const x = table.x + Math.cos(angle) * ring;
      const z = table.z + Math.sin(angle) * ring;
      const fits = ring + footprint < FURNITURE_TABLE_RADIUS - 0.005 &&
        occupied.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + footprint + 0.005);
      if (!fits) continue;
      const pack = buildPack(open);
      const yaw = rnd() * Math.PI * 2;
      lay(pack, x, FURNITURE_TABLE_HEIGHT, z, yaw);
      occupied.push({ x, z, r: footprint });
      break;
    }
  }

  // Billard table: one closed pack on the left frame, lying across it
  const frameX = -(PLAY_W / 2 + CUSHION_PROFILE_WIDTH + RAIL_WOOD_DEPTH / 2);
  const frameTop = TABLE_H + CUSHION_NOSE_TO_BED + 0.01;
  lay(buildPack(false), frameX, frameTop, PACK_FRAME_Z, Math.PI / 2);

  scene.add(group);
  return { group };
}
