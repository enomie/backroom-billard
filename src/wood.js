/**
 * Procedural wood: a grain texture and a glossy (clear-coated) material, shared by the table,
 * the wall paneling and the radio.
 */
import * as THREE from "three";

/**
 * Wood veneer with the grain running along u.
 * @param {{ base: string, light?: string, dark?: string, width?: number, height?: number,
 *           repeatX?: number, repeatY?: number }} o
 *   base — background color; light/dark — "r,g,b" of the lighter/darker grain lines
 */
export function woodTexture({
  base,
  light = "170,115,70",
  dark = "40,20,8",
  width = 512,
  height = 256,
  repeatX = 1,
  repeatY = 1,
}) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * height;
    ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? dark : light}, ${0.06 + Math.random() * 0.14})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(width / 3, y + (Math.random() - 0.5) * 8, (width * 2) / 3, y + (Math.random() - 0.5) * 8, width, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

/** Varnished wood: a glossy clear coat over a fairly rough base. */
export function glossyWoodMaterial(map, color = 0xffffff) {
  return new THREE.MeshPhysicalMaterial({
    color,
    map,
    roughness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
}
