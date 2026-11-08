/**
 * A concert grand piano with the lid closed (black lacquer, the full keyboard visible) and its
 * stool, at the wall opposite the door beside the neon sign. Sizes: piano-constants.js; see
 * _docs/piano.md. Local frame: origin on the floor in the middle of the case, +z = the keyboard.
 */
import * as THREE from "three";
import { ROOM_LENGTH } from "./room-constants.js";
import { receiveWallLampsDeep } from "./wall-lamp-light.js";
import {
  PIANO_X,
  PIANO_WALL_DISTANCE,
  PIANO_TURN,
  PIANO_WIDTH,
  PIANO_LENGTH,
  PIANO_RIM_BOTTOM,
  PIANO_RIM_TOP,
  PIANO_LID_THICKNESS,
  PIANO_LEG_RADIUS_TOP,
  PIANO_LEG_RADIUS_FOOT,
  PIANO_WHITE_KEYS,
  PIANO_WHITE_KEY_WIDTH,
  PIANO_WHITE_KEY_LENGTH,
  PIANO_BLACK_KEY_WIDTH,
  PIANO_BLACK_KEY_LENGTH,
  PIANO_KEYS_TOP,
  PIANO_KEYBED_DEPTH,
  PIANO_STOOL_WIDTH,
  PIANO_STOOL_DEPTH,
  PIANO_STOOL_HEIGHT,
  PIANO_STOOL_SEAT_THICKNESS,
  PIANO_STOOL_LEG_RADIUS,
  PIANO_STOOL_DISTANCE,
  PIANO_COLOR_LACQUER,
  PIANO_COLOR_WHITE_KEY,
  PIANO_COLOR_BLACK_KEY,
  PIANO_COLOR_STOOL_SEAT,
  PIANO_COLOR_BRASS,
  PIANO_CLICK_DISTANCE,
  PIANO_KEY_PRESS_ANGLE,
  PIANO_ENTER_DISTANCE,
  PIANO_SEAT_EYE_HEIGHT,
  PIANO_SEAT_BACK,
  PIANO_COMPUTER_KEYS,
  PIANO_MIDDLE_C,
} from "./piano-constants.js";
import { createPianoSound } from "./piano-sound.js";

/**
 * The outline of a grand piano seen from above, as a shape in the XY plane whose y is the distance
 * to the keyboard end turned around (y = −z): straight bass side on the left, the keyboard end
 * flat, the curved side on the right and the rounded tail.
 */
function caseShape(inflate = 0) {
  const w = PIANO_WIDTH / 2 + inflate;
  const l = PIANO_LENGTH / 2 + inflate;
  const s = new THREE.Shape();
  s.moveTo(-w, -l);
  s.lineTo(-w, l - 0.45); // the straight bass side
  s.bezierCurveTo(-w, l - 0.05, -w + 0.2, l, -w + 0.5, l); // the round tail
  s.bezierCurveTo(w * 0.35, l, w, l * 0.5, w, 0.1 - l * 0.1); // the long curve of the treble side
  s.lineTo(w, -l);
  s.closePath();
  return s;
}

/** A slab of the outline between two heights (the shape's y becomes −z, the extrusion up). */
function slab(shape, from, to, material) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: to - from, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 24 });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = from;
  return mesh;
}

/** @param {THREE.Scene} scene */
export function createPiano(scene) {
  const root = new THREE.Group();
  root.name = "piano";
  root.position.set(PIANO_X, 0, -ROOM_LENGTH / 2 + PIANO_WALL_DISTANCE);
  root.rotation.y = PIANO_TURN;

  const lacquer = new THREE.MeshPhysicalMaterial({ color: PIANO_COLOR_LACQUER, roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });
  const brass = new THREE.MeshStandardMaterial({ color: PIANO_COLOR_BRASS, roughness: 0.35, metalness: 0.6 });
  const front = PIANO_LENGTH / 2;

  // the case and the closed lid on top
  root.add(slab(caseShape(), PIANO_RIM_BOTTOM, PIANO_RIM_TOP, lacquer));
  root.add(slab(caseShape(0.012), PIANO_RIM_TOP, PIANO_RIM_TOP + PIANO_LID_THICKNESS, lacquer));

  // the keyboard block: a cheek on each side and the key bed between them, reaching out of the case
  const keysWidth = PIANO_WHITE_KEYS * PIANO_WHITE_KEY_WIDTH;
  const cheek = (PIANO_WIDTH - keysWidth) / 2;
  const block = (w, h, d, x, y, z, material = lacquer) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    root.add(m);
  };
  const cheekTop = PIANO_KEYS_TOP + 0.05; // the cheeks beside the keys are only a little higher than the keys
  for (const side of [-1, 1]) block(cheek, cheekTop - PIANO_RIM_BOTTOM, PIANO_KEYBED_DEPTH, side * (keysWidth + cheek) / 2, (cheekTop + PIANO_RIM_BOTTOM) / 2, front + PIANO_KEYBED_DEPTH / 2);
  const bedTop = PIANO_KEYS_TOP - 0.025;
  block(keysWidth, bedTop - PIANO_RIM_BOTTOM, PIANO_KEYBED_DEPTH, 0, (bedTop + PIANO_RIM_BOTTOM) / 2, front + PIANO_KEYBED_DEPTH / 2);
  // the name board: the front of the case above the keys, with a brass strip
  block(keysWidth, PIANO_RIM_TOP - PIANO_KEYS_TOP, 0.02, 0, (PIANO_RIM_TOP + PIANO_KEYS_TOP) / 2, front - 0.01);
  block(keysWidth * 0.5, 0.012, 0.004, 0, PIANO_RIM_TOP - 0.07, front + 0.002, brass);

  // the keys: 52 white (A0 to C8) and the black ones in the groups of two and three
  const whiteGeo = new THREE.BoxGeometry(PIANO_WHITE_KEY_WIDTH - 0.001, 0.02, PIANO_WHITE_KEY_LENGTH);
  const blackGeo = new THREE.BoxGeometry(PIANO_BLACK_KEY_WIDTH, 0.014, PIANO_BLACK_KEY_LENGTH);
  const whiteMat = new THREE.MeshStandardMaterial({ color: PIANO_COLOR_WHITE_KEY, roughness: 0.4 });
  const blackMat = new THREE.MeshStandardMaterial({ color: PIANO_COLOR_BLACK_KEY, roughness: 0.3 });
  const blackIndices = [];
  for (let i = 0; i < PIANO_WHITE_KEYS - 1; i++) if ([0, 1, 3, 4, 5].includes((i + 5) % 7)) blackIndices.push(i); // a black key after C, D, F, G, A
  const whites = new THREE.InstancedMesh(whiteGeo, whiteMat, PIANO_WHITE_KEYS);
  const blacks = new THREE.InstancedMesh(blackGeo, blackMat, blackIndices.length);
  const matrix = new THREE.Matrix4();
  const keyX = (i) => -keysWidth / 2 + (i + 0.5) * PIANO_WHITE_KEY_WIDTH;
  // every key: its note (midi), where it is, the instanced mesh and the index in it. A key tips about its back end when pressed.
  const keys = [];
  const semitones = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
  for (let i = 0; i < PIANO_WHITE_KEYS; i++) {
    const p = i + 5; // counted from C0; the first key is A0
    keys.push({ black: false, mesh: whites, index: i, midi: 12 * (Math.floor(p / 7) + 1) + semitones[p % 7], x: keyX(i), y: PIANO_KEYS_TOP - 0.01, length: PIANO_WHITE_KEY_LENGTH, width: PIANO_WHITE_KEY_WIDTH });
  }
  blackIndices.forEach((index, n) => {
    const white = keys[index];
    keys.push({ black: true, mesh: blacks, index: n, midi: white.midi + 1, x: white.x + PIANO_WHITE_KEY_WIDTH / 2, y: PIANO_KEYS_TOP + 0.007, length: PIANO_BLACK_KEY_LENGTH, width: PIANO_BLACK_KEY_WIDTH });
  });
  const tip = new THREE.Matrix4();
  const tipTurn = new THREE.Matrix4();
  const setKey = (key, pressed) => {
    // about the back end of the key (where it meets the case)
    tip.makeTranslation(key.x, key.y, front);
    tipTurn.makeRotationX(pressed ? PIANO_KEY_PRESS_ANGLE * (key.black ? 1.4 : 1) : 0);
    tip.multiply(tipTurn).multiply(matrix.makeTranslation(0, 0, key.length / 2));
    key.mesh.setMatrixAt(key.index, tip);
    key.mesh.instanceMatrix.needsUpdate = true;
  };
  keys.forEach((key) => setKey(key, false));
  whites.frustumCulled = blacks.frustumCulled = false;
  root.add(whites, blacks);

  // three legs (tapered) and the brass feet
  const legHeight = PIANO_RIM_BOTTOM;
  const legGeo = new THREE.CylinderGeometry(PIANO_LEG_RADIUS_TOP, PIANO_LEG_RADIUS_FOOT, legHeight, 16);
  const footGeo = new THREE.CylinderGeometry(PIANO_LEG_RADIUS_FOOT * 1.3, PIANO_LEG_RADIUS_FOOT * 1.1, 0.03, 16);
  const legs = [[-PIANO_WIDTH / 2 + 0.12, front - 0.12], [PIANO_WIDTH / 2 - 0.12, front - 0.12], [-0.05, -front + 0.3]];
  for (const [x, z] of legs) {
    const leg = new THREE.Mesh(legGeo, lacquer);
    leg.position.set(x, legHeight / 2 + 0.015, z);
    const foot = new THREE.Mesh(footGeo, brass);
    foot.position.set(x, 0.015, z);
    root.add(leg, foot);
  }
  // the pedal lyre under the keys: a box with three brass pedals
  block(0.16, 0.2, 0.05, 0, PIANO_RIM_BOTTOM - 0.12, front + 0.18);
  for (const x of [-0.05, 0, 0.05]) {
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.07), brass);
    pedal.position.set(x, 0.07, front + 0.24);
    root.add(pedal);
  }

  // the stool: padded seat on four legs, turned to the keyboard
  const stool = new THREE.Group();
  stool.position.set(0, 0, front + PIANO_KEYBED_DEPTH + PIANO_STOOL_DISTANCE);
  const seatMat = new THREE.MeshStandardMaterial({ color: PIANO_COLOR_STOOL_SEAT, roughness: 0.6 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(PIANO_STOOL_WIDTH, PIANO_STOOL_SEAT_THICKNESS, PIANO_STOOL_DEPTH), seatMat);
  seat.position.y = PIANO_STOOL_HEIGHT - PIANO_STOOL_SEAT_THICKNESS / 2;
  stool.add(seat);
  const legLength = PIANO_STOOL_HEIGHT - PIANO_STOOL_SEAT_THICKNESS;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(PIANO_STOOL_LEG_RADIUS, PIANO_STOOL_LEG_RADIUS * 0.8, legLength, 10), lacquer);
    leg.position.set(sx * (PIANO_STOOL_WIDTH / 2 - 0.05), legLength / 2, sz * (PIANO_STOOL_DEPTH / 2 - 0.05));
    stool.add(leg);
  }
  root.add(stool);

  receiveWallLampsDeep(root);
  scene.add(root);

  /* ---- Playing: a press on a key plays its note until the button is let go --------------------- */
  const sound = createPianoSound([root.position.x, PIANO_KEYS_TOP, root.position.z]);
  const raycaster = new THREE.Raycaster();
  const inverse = new THREE.Matrix4();
  const local = new THREE.Ray();
  let held = null; // { key, id }

  /** The key under the pointer (the black ones lie over the white ones), or null. */
  function keyAt(camera, ndc) {
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
    root.updateMatrixWorld();
    local.copy(raycaster.ray).applyMatrix4(inverse.copy(root.matrixWorld).invert());
    if (local.direction.y > -1e-4) return null;
    const distance = (PIANO_KEYS_TOP - local.origin.y) / local.direction.y;
    if (distance < 0 || distance > PIANO_CLICK_DISTANCE) return null;
    const x = local.origin.x + local.direction.x * distance;
    const z = local.origin.z + local.direction.z * distance - front;
    if (z < 0 || z > PIANO_WHITE_KEY_LENGTH) return null;
    const blackHit = keys.find((k) => k.black && z < k.length && Math.abs(x - k.x) < k.width / 2 + 0.001);
    if (blackHit) return blackHit;
    const i = Math.floor((x + keysWidth / 2) / PIANO_WHITE_KEY_WIDTH);
    return i >= 0 && i < PIANO_WHITE_KEYS ? keys[i] : null;
  }

  const heldByCode = new Map(); // the computer keys held down: code → { key, id }
  const keyPosition = new THREE.Vector3();

  return {
    group: root,
    /** True when the (free) camera is close enough to the keyboard to sit down. */
    isNear(camera) {
      root.localToWorld(keyPosition.set(0, 0, front + 0.2));
      return Math.hypot(camera.position.x - keyPosition.x, camera.position.z - keyPosition.z) < PIANO_ENTER_DISTANCE;
    },
    /** Where the eyes are when sitting at the piano and what they look at (world positions). */
    seat() {
      root.updateMatrixWorld();
      return {
        position: root.localToWorld(new THREE.Vector3(0, PIANO_SEAT_EYE_HEIGHT, front + PIANO_SEAT_BACK)),
        target: root.localToWorld(new THREE.Vector3(0, PIANO_KEYS_TOP - 0.02, front + 0.08)),
      };
    },
    /** A computer key goes down: plays its note (true if the key belongs to the piano). */
    keyDown(code, repeat) {
      const offset = PIANO_COMPUTER_KEYS[code];
      if (offset === undefined) return false;
      if (repeat || heldByCode.has(code)) return true;
      const key = keys.find((k) => k.midi === PIANO_MIDDLE_C + offset);
      if (!key) return true;
      heldByCode.set(code, { key, id: sound.noteOn(key.midi, key.black ? 0.7 : 0.8) });
      setKey(key, true);
      return true;
    },
    /** A computer key goes up: the note ends (true if this key was playing). */
    keyUp(code) {
      const note = heldByCode.get(code);
      if (!note) return false;
      sound.noteOff(note.id);
      setKey(note.key, false);
      heldByCode.delete(code);
      return true;
    },
    /** Let go of everything (the window lost the focus, the camera left). */
    releaseAll() {
      for (const code of [...heldByCode.keys()]) this.keyUp(code);
      this.release();
    },
    /**
     * A press of the mouse button: plays the key under the pointer.
     * @param {THREE.Camera} camera
     * @param {{ x: number, y: number }} ndc — pointer in normalized device coordinates
     * @returns {boolean} true if a key was hit
     */
    pressAt(camera, ndc) {
      const key = keyAt(camera, ndc);
      if (!key) return false;
      this.release();
      held = { key, id: sound.noteOn(key.midi, key.black ? 0.7 : 0.8) };
      setKey(key, true);
      return true;
    },
    /** The button is let go: the held note ends. */
    release() {
      if (!held) return;
      sound.noteOff(held.id);
      setKey(held.key, false);
      held = null;
    },
  };
}
