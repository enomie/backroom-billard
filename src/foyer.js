/**
 * The foyer behind the door: a square, brightly lit room with a marble floor, a globe lamp and a
 * real point light in a globe lamp half sunk into the ceiling. Its shadow keeps the light in the foyer; a spot behind the door throws an amber
 * beam through the glass and the slits into the backroom. The foyer is not touched by the room's fog. See foyer-constants.js.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ROOM_LENGTH } from "./room-constants.js";
import { DOOR_WALL_DEPTH } from "./door-constants.js";
import { wallWithDoorGeometry } from "./door.js";
import * as C from "./foyer-constants.js";

function canvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** 2 × 2 tiles with a faint vein pattern; repeats over the floor. */
function floorTexture() {
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    for (let i = 0; i < 4; i++) {
      const [x, y] = [(i % 2) * (w / 2), Math.floor(i / 2) * (h / 2)];
      ctx.fillStyle = (i + Math.floor(i / 2)) % 2 === 0 ? C.FOYER_COLOR_TILE_LIGHT : C.FOYER_COLOR_TILE_DARK;
      ctx.fillRect(x, y, w / 2, h / 2);
      ctx.strokeStyle = "rgba(128,128,128,0.12)";
      for (let v = 0; v < 6; v++) {
        ctx.beginPath();
        ctx.moveTo(x + Math.random() * (w / 2), y);
        ctx.bezierCurveTo(x + Math.random() * (w / 2), y + h / 6, x + Math.random() * (w / 2), y + h / 3, x + Math.random() * (w / 2), y + h / 2);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; // grout
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w / 2, h / 2);
    }
  });
  texture.repeat.set(C.FOYER_SIZE / (2 * C.FOYER_TILE), C.FOYER_SIZE / (2 * C.FOYER_TILE));
  return texture;
}

/** Dark green wainscot up to the brass rail, cream above (v runs from the floor to the ceiling). */
function wallTexture() {
  return canvasTexture(8, 512, (ctx, w, h) => {
    const rail = h * (1 - C.FOYER_RAIL_HEIGHT / C.FOYER_HEIGHT);
    ctx.fillStyle = C.FOYER_COLOR_WALL;
    ctx.fillRect(0, 0, w, rail);
    ctx.fillStyle = C.FOYER_COLOR_WAINSCOT;
    ctx.fillRect(0, rail, w, h - rail);
  });
}

/** @param {THREE.Scene} scene */
export function createFoyer(scene) {
  const group = new THREE.Group();
  group.name = "foyer";
  const half = C.FOYER_SIZE / 2;
  const nearZ = ROOM_LENGTH / 2 + DOOR_WALL_DEPTH;
  group.position.set(0, 0, nearZ + half); // the middle of the floor

  // the foyer glows a little by itself (emissive = its own color, dimmed)
  const material = (parameters) => {
    const m = new THREE.MeshStandardMaterial({ fog: false, ...parameters });
    m.emissive = new THREE.Color(0xffffff);
    m.emissiveMap = m.map;
    m.emissiveIntensity = C.FOYER_GLOW;
    return m;
  };
  const floorMaterial = material({ map: floorTexture(), roughness: 0.28 });
  const wallMaterial = material({ map: wallTexture(), roughness: 0.9 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: C.FOYER_COLOR_CEILING,
    emissive: C.FOYER_COLOR_CEILING,
    emissiveIntensity: C.FOYER_GLOW,
    roughness: 0.95,
    fog: false,
  });
  const brass = new THREE.MeshStandardMaterial({ color: C.FOYER_COLOR_BRASS, roughness: 0.35, metalness: 0.85, fog: false });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(C.FOYER_SIZE, C.FOYER_SIZE), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(C.FOYER_SIZE, C.FOYER_SIZE), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = C.FOYER_HEIGHT;
  ceiling.receiveShadow = true;
  group.add(floor, ceiling);

  // walls (facing inwards): the near one has the door opening
  const walls = [
    [wallWithDoorGeometry(C.FOYER_SIZE, C.FOYER_HEIGHT), 0, -half, 0],
    [new THREE.PlaneGeometry(C.FOYER_SIZE, C.FOYER_HEIGHT).translate(0, C.FOYER_HEIGHT / 2, 0), 0, half, Math.PI],
    [new THREE.PlaneGeometry(C.FOYER_SIZE, C.FOYER_HEIGHT).translate(0, C.FOYER_HEIGHT / 2, 0), -half, 0, Math.PI / 2],
    [new THREE.PlaneGeometry(C.FOYER_SIZE, C.FOYER_HEIGHT).translate(0, C.FOYER_HEIGHT / 2, 0), half, 0, -Math.PI / 2],
  ];
  for (const [geometry, x, z, rotationY] of walls) {
    const wall = new THREE.Mesh(geometry, wallMaterial);
    wall.position.set(x, 0, z);
    wall.rotation.y = rotationY;
    wall.receiveShadow = true;
    group.add(wall);
  }

  // brass baseboard and rail around the walls
  const strips = [];
  for (const [height, y, depth] of [[C.FOYER_BASEBOARD_HEIGHT, C.FOYER_BASEBOARD_HEIGHT / 2, 0.025], [0.03, C.FOYER_RAIL_HEIGHT, 0.02]]) {
    strips.push(
      new THREE.BoxGeometry(C.FOYER_SIZE, height, depth).translate(0, y, -half + depth / 2),
      new THREE.BoxGeometry(C.FOYER_SIZE, height, depth).translate(0, y, half - depth / 2),
      new THREE.BoxGeometry(depth, height, C.FOYER_SIZE - 2 * depth).translate(-half + depth / 2, y, 0),
      new THREE.BoxGeometry(depth, height, C.FOYER_SIZE - 2 * depth).translate(half - depth / 2, y, 0)
    );
  }
  group.add(new THREE.Mesh(mergeGeometries(strips), brass));

  // the globe lamp: the lower half of a sphere of opal glass, half sunk into the ceiling
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(C.FOYER_LAMP_RADIUS, 48, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: C.FOYER_LAMP_GLOW, roughness: 0.4, fog: false })
  );
  globe.position.y = C.FOYER_HEIGHT;
  group.add(globe);

  const light = new THREE.PointLight(C.FOYER_LIGHT_COLOR, C.FOYER_LIGHT_INTENSITY, C.FOYER_LIGHT_DISTANCE, C.FOYER_LIGHT_DECAY);
  light.position.y = C.FOYER_HEIGHT - C.FOYER_LIGHT_DROP;
  light.castShadow = true;
  light.shadow.mapSize.set(C.FOYER_SHADOW_MAP_SIZE, C.FOYER_SHADOW_MAP_SIZE);
  light.shadow.radius = C.FOYER_SHADOW_RADIUS;
  light.shadow.camera.near = 0.2;
  light.shadow.camera.far = C.FOYER_LIGHT_DISTANCE + 2;
  light.shadow.bias = -0.0006;
  light.shadow.normalBias = 0.02;
  light.shadow.autoUpdate = false; // nothing moves in the foyer: the shadow is drawn once
  light.shadow.needsUpdate = true;
  group.add(light);

  // the beam through the glass and the slits
  const spill = new THREE.SpotLight(C.FOYER_SPILL_COLOR, C.FOYER_SPILL_INTENSITY, C.FOYER_SPILL_DISTANCE, C.FOYER_SPILL_ANGLE, C.FOYER_SPILL_PENUMBRA, C.FOYER_SPILL_DECAY);
  spill.position.set(0, C.FOYER_SPILL_HEIGHT, -half + C.FOYER_SPILL_BEHIND);
  spill.target.position.set(0, 0.3, C.FOYER_SPILL_AIM_Z - (nearZ + half));
  spill.castShadow = true;
  spill.shadow.mapSize.set(C.FOYER_SHADOW_MAP_SIZE, C.FOYER_SHADOW_MAP_SIZE);
  spill.shadow.radius = C.FOYER_SHADOW_RADIUS;
  spill.shadow.bias = -0.0004;
  spill.shadow.normalBias = 0.01;
  spill.shadow.autoUpdate = false;
  spill.shadow.needsUpdate = true;
  group.add(spill, spill.target);

  scene.add(group);
  return { group };
}
