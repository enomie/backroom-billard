/**
 * The neon sign "BACKROOM" (blue) over "BILLARD" (yellow) in the font of the title, on the short wall
 * opposite the door. Tubes drawn as outlines on a canvas with a glow; the plane is added to the
 * picture (no light, so it costs nothing per pixel). Dimensions: neon-sign-constants.js.
 */
import * as THREE from "three";
import { ROOM_LENGTH } from "./room-constants.js";
import { NEON_SIGN_WIDTH, NEON_SIGN_CENTER_Y, NEON_SIGN_WALL_GAP, NEON_SIGN_LINES, NEON_SIGN_GLOW } from "./neon-sign-constants.js";

const W = 1536;
const H = 720;

function signTexture() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const lineHeight = H / NEON_SIGN_LINES.length;
  NEON_SIGN_LINES.forEach((line, i) => {
    // the font size so that the word fills the width (the word is wider than high)
    ctx.font = "400 200px Limelight, serif";
    const size = Math.min(200 * ((W - 120) / ctx.measureText(line.text).width), lineHeight * 0.85);
    ctx.font = `400 ${size}px Limelight, serif`;
    const y = lineHeight * (i + 0.5);
    ctx.shadowColor = line.color;
    for (const [blur, width, color, alpha] of [[70, 12, line.color, 0.5], [30, 9, line.color, 0.8], [14, 6, line.color, 1], [4, 3, line.core, 1]]) {
      ctx.shadowBlur = blur * NEON_SIGN_GLOW;
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.strokeText(line.text, W / 2, y);
    }
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** @param {THREE.Scene} scene */
export function createNeonSign(scene) {
  const material = new THREE.MeshBasicMaterial({
    map: signTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(NEON_SIGN_WIDTH, (NEON_SIGN_WIDTH * H) / W), material);
  sign.name = "neon-sign";
  sign.position.set(0, NEON_SIGN_CENTER_Y, -ROOM_LENGTH / 2 + NEON_SIGN_WALL_GAP);
  sign.renderOrder = 3;
  scene.add(sign);
  return sign;
}
