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
  WAINSCOT_HEIGHT,
  WAINSCOT_THICKNESS,
  WAINSCOT_PANEL_WIDTH,
  WAINSCOT_COLOR,
  WAINSCOT_WOOD_BASE,
  FOG_COLOR,
  FOG_NEAR,
  FOG_FAR,
  FOG_MAX_OPACITY,
} from "./room-constants.js";
import { woodTexture, glossyWoodMaterial } from "./wood.js";
import { wallWithDoorGeometry } from "./door.js";
import { DOOR_OPENING_WIDTH, DOOR_CASING_WIDTH } from "./door-constants.js";

/**
 * Three.js fog is fully opaque at `far`. Cap its strength at FOG_MAX_OPACITY so the far room
 * stays visible through the haze. Must run before the first material is compiled.
 */
THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace(
  "mix( gl_FragColor.rgb, fogColor, fogFactor )",
  `mix( gl_FragColor.rgb, fogColor, fogFactor * ${FOG_MAX_OPACITY.toFixed(3)} )`
);

/** Small procedural canvas texture helper. */
function canvasTexture(size, draw, repeatX = 1, repeatY = 1, height = size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = height;
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
function ceilingTexture() {
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

/** One framed panel: vertical grain, a groove around a slightly lighter field. Repeats along the wall. */
function panelTexture() {
  const w = 256;
  const h = Math.round((w * WAINSCOT_HEIGHT) / WAINSCOT_PANEL_WIDTH);
  return canvasTexture(w, (ctx) => {
    ctx.fillStyle = WAINSCOT_WOOD_BASE;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      const x = Math.random() * w;
      ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? "30,12,4" : "150,80,45"}, ${0.06 + Math.random() * 0.14})`;
      ctx.lineWidth = 0.6 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (Math.random() - 0.5) * 8, h / 3, x + (Math.random() - 0.5) * 8, (h * 2) / 3, x, h);
      ctx.stroke();
    }
    const edge = 22; // stile/rail width in px
    const rect = (inset) => [inset, inset, w - 2 * inset, h - 2 * inset];
    // dark groove between frame and field, light/dark edges for a raised-panel look
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(15,6,2,0.85)";
    ctx.strokeRect(...rect(edge));
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,200,150,0.25)";
    ctx.strokeRect(...rect(edge + 3));
    ctx.fillStyle = "rgba(255,190,130,0.06)";
    ctx.fillRect(...rect(edge + 4));
    ctx.strokeStyle = "rgba(15,6,2,0.9)"; // seam between neighbouring panels
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
  }, 1, 1, h);
}

/** Extruded profile along a wall: shape x = out of the wall, y = up; result centered on the wall length. */
function railGeometry(points, length) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(0, 0, -length / 2);
  return geo;
}

/** Quarter circle from (cx + r, cy) over the top to (cx, cy + r) as polyline points. */
function roundedCorner(cx, cy, r, steps = 6) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * (Math.PI / 2);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

/**
 * Paneling for one wall. `wall` is a group with its origin on the wall surface, +z into the room.
 * @param {THREE.Group} wall
 * @param {number} length — wall length
 * @param {number} x — center of this piece along the wall (a wall with a door has two)
 */
function addWainscot(wall, length, mats, x = 0) {
  const T = WAINSCOT_THICKNESS;
  const H = WAINSCOT_HEIGHT;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(length, H, T), mats.panel(length));
  panel.position.set(x, H / 2, T / 2);
  panel.castShadow = panel.receiveShadow = true;

  // Baseboard: stepped, rounded top edge
  const base = [[0, 0], [0.05, 0], [0.05, 0.11], [0.045, 0.125], [0.03, 0.14], [0, 0.14]];
  // Cap rail: flat ledge, convex ovolo, narrow neck, small bead, rounded top
  const cap = [
    [0, 0],
    [0.08, 0],
    [0.08, 0.008],
    ...roundedCorner(0.055, 0.008, 0.025),
    [0.055, 0.045],
    [0.065, 0.045],
    ...roundedCorner(0.045, 0.045, 0.02),
    [0, 0.065],
  ];
  const baseboard = new THREE.Mesh(railGeometry(base, length), mats.trim);
  baseboard.rotation.y = -Math.PI / 2;
  const capRail = new THREE.Mesh(railGeometry(cap, length), mats.trim);
  capRail.rotation.y = -Math.PI / 2;
  capRail.position.set(x, H, 0);
  baseboard.position.x = x;
  for (const m of [baseboard, capRail]) m.castShadow = m.receiveShadow = true;
  wall.add(panel, baseboard, capRail);
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
    map: ceilingTexture(),
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

  // Paneling: panels repeat every WAINSCOT_PANEL_WIDTH along the wall
  const panelMap = panelTexture();
  const panelMats = {
    panel: (length) => {
      const map = panelMap.clone();
      map.repeat.set(Math.round(length / WAINSCOT_PANEL_WIDTH), 1);
      map.needsUpdate = true;
      return glossyWoodMaterial(map, WAINSCOT_COLOR);
    },
    trim: glossyWoodMaterial(woodTexture({ base: WAINSCOT_WOOD_BASE, dark: "30,12,4", light: "150,80,45" })),
  };

  // Walls (face inwards): ±z are the short walls, ±x the long walls. Each wall is a group with its
  // origin on the wall surface, +z into the room; the paneling sits on its lower part.
  const addWall = (width, x, z, rotationY, withDoor = false) => {
    const wall = new THREE.Group();
    wall.position.set(x, 0, z);
    wall.rotation.y = rotationY;
    const plane = new THREE.Mesh(withDoor ? wallWithDoorGeometry(width, ROOM_HEIGHT) : new THREE.PlaneGeometry(width, ROOM_HEIGHT), wallMat);
    if (!withDoor) plane.position.y = ROOM_HEIGHT / 2;
    wall.add(plane);
    if (withDoor) {
      // two pieces of paneling, ending at the trim of the door
      const edge = DOOR_OPENING_WIDTH / 2 + DOOR_CASING_WIDTH;
      const length = width / 2 - edge;
      for (const side of [-1, 1]) addWainscot(wall, length, panelMats, side * (edge + length / 2));
    } else {
      addWainscot(wall, width, panelMats);
    }
    group.add(wall);
  };
  addWall(ROOM_WIDTH, 0, -ROOM_LENGTH / 2, 0);
  addWall(ROOM_WIDTH, 0, ROOM_LENGTH / 2, Math.PI, true); // the door wall: behind the player at the start
  addWall(ROOM_LENGTH, -ROOM_WIDTH / 2, 0, Math.PI / 2);
  addWall(ROOM_LENGTH, ROOM_WIDTH / 2, 0, -Math.PI / 2);

  scene.add(group);
  return { group };
}
