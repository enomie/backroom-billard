/**
 * The room around the table: carpet floor, four cream-colored walls, wooden ceiling.
 * Sizes and colors live in room-constants.js; the fog is set up here as well.
 */
import * as THREE from "three";
import {
  ROOM_LENGTH,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  ROOM_COLOR_CARPET,
  ROOM_COLOR_WALL,
  ROOM_WALL_SMOKE_GRADIENT,
  ROOM_COLOR_CEILING_WOOD,
  FOG_COLOR,
  FOG_NEAR,
  FOG_FAR,
  FOG_MAX_OPACITY,
} from "./room-constants.js";

/**
 * Three.js fog is fully opaque at `far`. Cap its strength at FOG_MAX_OPACITY so the far room
 * stays visible through the haze. Must run before the first material is compiled.
 */
THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace(
  "mix( gl_FragColor.rgb, fogColor, fogFactor )",
  `mix( gl_FragColor.rgb, fogColor, fogFactor * ${FOG_MAX_OPACITY.toFixed(3)} )`
);

/** Small procedural canvas texture helper. */
function canvasTexture(size, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d"), size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Carpet: fine grayscale noise, tinted by the material color. */
function carpetTexture() {
  return canvasTexture(
    256,
    (ctx, size) => {
      const img = ctx.createImageData(size, size);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 170 + Math.random() * 85;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    },
    ROOM_WIDTH * 2,
    ROOM_LENGTH * 2
  );
}

/** Wooden boards running along the room length, with grain lines. */
function woodTexture() {
  return canvasTexture(
    512,
    (ctx, size) => {
      const boards = 6;
      const w = size / boards;
      for (let b = 0; b < boards; b++) {
        const tone = 150 + Math.random() * 60;
        ctx.fillStyle = `rgb(${tone}, ${tone * 0.8}, ${tone * 0.6})`;
        ctx.fillRect(b * w, 0, w, size);
        for (let g = 0; g < 40; g++) {
          const x = b * w + Math.random() * w;
          ctx.strokeStyle = `rgba(40, 20, 8, ${0.05 + Math.random() * 0.12})`;
          ctx.lineWidth = 0.5 + Math.random() * 1.5;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + (Math.random() - 0.5) * 6, size);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(20, 10, 4, 0.7)"; // gap between boards
        ctx.fillRect(b * w, 0, 2, size);
      }
    },
    3,
    4
  );
}

/** Vertical gradient for the walls: lighter at the bottom, smoke-darkened at the top. */
function wallTexture() {
  return canvasTexture(64, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    const top = Math.round(255 * (1 - ROOM_WALL_SMOKE_GRADIENT));
    grad.addColorStop(0, `rgb(${top}, ${Math.round(top * 0.92)}, ${Math.round(top * 0.78)})`);
    grad.addColorStop(0.6, "rgb(255, 255, 255)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });
}

/**
 * Build the room and the fog.
 * @param {THREE.Scene} scene
 */
export function createRoom(scene) {
  // Smoke-colored linear fog; also the background (never visible inside the closed room)
  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

  const group = new THREE.Group();
  group.name = "room";

  const floorMat = new THREE.MeshStandardMaterial({
    color: ROOM_COLOR_CARPET,
    map: carpetTexture(),
    roughness: 1,
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: ROOM_COLOR_CEILING_WOOD,
    map: woodTexture(),
    roughness: 0.7,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: ROOM_COLOR_WALL,
    map: wallTexture(),
    roughness: 0.95,
  });

  // Floor (faces up)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_LENGTH), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Ceiling (faces down)
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_LENGTH), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_HEIGHT;
  group.add(ceiling);

  // Walls (face inwards): ±z are the short walls, ±x the long walls
  const addWall = (width, x, z, rotationY) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, ROOM_HEIGHT), wallMat);
    wall.position.set(x, ROOM_HEIGHT / 2, z);
    wall.rotation.y = rotationY;
    group.add(wall);
  };
  addWall(ROOM_WIDTH, 0, -ROOM_LENGTH / 2, 0);
  addWall(ROOM_WIDTH, 0, ROOM_LENGTH / 2, Math.PI);
  addWall(ROOM_LENGTH, -ROOM_WIDTH / 2, 0, Math.PI / 2);
  addWall(ROOM_LENGTH, ROOM_WIDTH / 2, 0, -Math.PI / 2);

  scene.add(group);
  return { group };
}
