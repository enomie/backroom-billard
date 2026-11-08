/**
 * Zippo-style flip-top lighters: a brushed-metal case with a hinged lid, chimney, flint wheel and
 * a small flame. One per player on the frame of the billard table: silver and gold.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PLAY_W, TABLE_H, CUSHION_NOSE_TO_BED, CUSHION_PROFILE_WIDTH, RAIL_WOOD_DEPTH } from "./table-constants.js";
import {
  LIGHTER_WIDTH,
  LIGHTER_DEPTH,
  LIGHTER_CASE_HEIGHT,
  LIGHTER_LID_HEIGHT,
  LIGHTER_LID_ANGLE,
  LIGHTER_COLORS,
  LIGHTER_FRAME_Z,
  LIGHTER_FLAME_HEIGHT,
} from "./lighter-constants.js";
import { applyBallReflection } from "./ball-reflection.js";
import { glowTexture } from "./glow.js";

/** Fine horizontal grinding lines: the brushed look (used as bump and roughness map). */
function brushedTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const y = Math.random() * 256;
    ctx.strokeStyle = Math.random() < 0.5 ? `rgba(255,255,255,${0.04 + Math.random() * 0.1})` : `rgba(0,0,0,${0.04 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Teardrop flame, pointed at the top. */
function flameGeometry() {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(Math.max(0.0001, 0.0055 * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - 0.4 * t)), t * LIGHTER_FLAME_HEIGHT));
  }
  return new THREE.LatheGeometry(pts, 12);
}

/**
 * @param {THREE.Scene} scene
 * @returns {{ lighters: any[], applyReflection: (reflection: object) => void }}
 *   each lighter: { side, group, rest, setOpen(k), setFlame(on), flameLocal }
 */
export function createLighters(scene) {
  const brushed = brushedTexture();
  const materials = LIGHTER_COLORS.map(
    (color) => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.42, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.6 })
  );
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a8a8e, metalness: 1, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.6 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false });
  const flameCore = new THREE.MeshBasicMaterial({ color: 0x9ec8ff, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false });
  const glowMap = glowTexture();

  const W = LIGHTER_WIDTH;
  const D = LIGHTER_DEPTH;
  const CASE = LIGHTER_CASE_HEIGHT;
  const LID = LIGHTER_LID_HEIGHT;
  const caseGeo = new RoundedBoxGeometry(W, CASE, D, 3, 0.0025);
  const lidGeo = new RoundedBoxGeometry(W, LID, D, 3, 0.0025);
  const insertGeo = new RoundedBoxGeometry(W - 0.004, 0.01, D - 0.003, 2, 0.001);
  const chimneyGeo = new RoundedBoxGeometry(0.013, 0.02, D - 0.004, 2, 0.001);
  const wheelGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.006, 16).rotateZ(Math.PI / 2);
  const holeGeo = new THREE.CylinderGeometry(0.0012, 0.0012, D - 0.003, 8).rotateX(Math.PI / 2);
  const outerFlame = flameGeometry();
  const innerFlame = flameGeometry().scale(0.45, 0.6, 0.45);

  const frameX = -(PLAY_W / 2 + CUSHION_PROFILE_WIDTH + RAIL_WOOD_DEPTH / 2);
  const frameTop = TABLE_H + CUSHION_NOSE_TO_BED + 0.01;
  const group = new THREE.Group();
  group.name = "lighters";

  const lighters = [-1, 1].map((sz, side) => {
    const metal = materials[side];
    const root = new THREE.Group(); // origin: middle of the bottom of the case, standing upright
    const body = new THREE.Mesh(caseGeo, metal);
    body.position.y = CASE / 2;
    const insert = new THREE.Mesh(insertGeo, steel);
    insert.position.y = CASE + 0.002;
    const chimney = new THREE.Mesh(chimneyGeo, steel);
    chimney.position.set(0, CASE + 0.011, 0);
    const wheel = new THREE.Mesh(wheelGeo, steel);
    wheel.position.set(-0.0045, CASE + 0.018, 0.0);
    const holes = [0.004, 0.011].map((y) => {
      const h = new THREE.Mesh(holeGeo, dark);
      h.position.set(0.0, CASE + y, 0);
      return h;
    });
    const lid = new THREE.Group(); // hinged at the top of the back
    lid.position.set(0, CASE, -D / 2);
    const lidMesh = new THREE.Mesh(lidGeo, metal);
    lidMesh.position.set(0, LID / 2, D / 2);
    lid.add(lidMesh);

    const flame = new THREE.Group();
    flame.position.set(0.0, CASE + 0.021, 0);
    flame.add(new THREE.Mesh(outerFlame, flameMat), new THREE.Mesh(innerFlame, flameCore));
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowMap, color: 0xffa040, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    );
    glow.scale.setScalar(0.08);
    glow.position.y = LIGHTER_FLAME_HEIGHT * 0.4;
    flame.add(glow);
    flame.visible = false;

    root.add(body, insert, chimney, wheel, ...holes, lid, flame);
    for (const m of [body, lidMesh]) m.castShadow = m.receiveShadow = true;

    // lying on its broad side across the frame, the lid end pointing along the frame
    root.rotation.set(-Math.PI / 2, Math.PI / 2, 0, "YXZ");
    const center = new THREE.Vector3(frameX, frameTop + D / 2, sz * LIGHTER_FRAME_Z);
    const half = new THREE.Vector3(0, (CASE + LID) / 2, 0).applyQuaternion(root.quaternion);
    root.position.copy(center).sub(half);
    group.add(root);

    return {
      side,
      group: root,
      rest: { position: root.position.clone(), quaternion: root.quaternion.clone() },
      /** Where the tip of the flame is, in the lighter's own (upright) coordinates. */
      flameLocal: new THREE.Vector3(0, CASE + 0.021 + LIGHTER_FLAME_HEIGHT * 0.8, 0),
      /** Open the lid: 0 closed … 1 wide open. */
      setOpen(k) {
        lid.rotation.x = -LIGHTER_LID_ANGLE * THREE.MathUtils.clamp(k, 0, 1);
      },
      setFlame(on, time = 0) {
        flame.visible = on;
        if (on) {
          const f = 1 + 0.12 * Math.sin(time * 38) + 0.08 * Math.sin(time * 61);
          flame.scale.set(1 / Math.sqrt(f), f, 1 / Math.sqrt(f));
        }
      },
    };
  });

  scene.add(group);
  return {
    lighters,
    applyReflection(reflection) {
      for (const m of [...materials, steel]) {
        applyBallReflection(m, reflection);
        m.envMapIntensity = 2;
      }
    },
  };
}
