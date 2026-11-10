/**
 * A face as a ball floating in the room (a head with nose, eyes, brows, hair and beard, drawn from the
 * same data as the preview on the welcome screen, see face.js) and a small sign above it with the
 * flag and the name. It hangs at one place; a click on it throws the dice for a new random face.
 * This is also how the others will see a player later (see _docs/multiplayer.md).
 */
import * as THREE from "three";
import { randomFace, darker } from "./face.js";
import { flagUrl, DEFAULT_COUNTRY } from "./country-list.js";
import { displayName } from "./name-rules.js";
import {
  FACE_BALL_POSITION,
  FACE_BALL_TURN,
  FACE_BALL_RADIUS,
  FACE_BALL_CLICK_DISTANCE,
} from "./face-ball-constants.js";

const R = FACE_BALL_RADIUS;

/** The signboard above the head: a round flag and the name, one compact line. */
function makeSign() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 80;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: false }));
  const height = R * 0.5;
  sprite.scale.set((height * canvas.width) / canvas.height, height, 1);
  sprite.position.y = R * 1.55;
  const flag = new Image();
  let text = "";
  const draw = () => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 44px Roboto, sans-serif";
    const textWidth = ctx.measureText(text).width;
    const total = 56 + 16 + textWidth + 32; // flag, gap, name, padding
    const x0 = (canvas.width - total) / 2;
    ctx.fillStyle = "rgba(20,14,10,0.8)";
    ctx.beginPath();
    ctx.roundRect(x0, 8, total, 64, 32);
    ctx.fill();
    if (flag.complete && flag.naturalWidth) ctx.drawImage(flag, x0 + 12, 12, 56, 56);
    ctx.fillStyle = "#fde68a";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x0 + 12 + 56 + 16, 42);
    texture.needsUpdate = true;
  };
  flag.addEventListener("load", draw);
  return {
    sprite,
    set(name, country) {
      text = name;
      flag.src = flagUrl(country);
      draw();
    },
  };
}

/**
 * @param {THREE.Scene} scene
 * @param {{ placed?: boolean }} [options] — `placed: false` for the face of another player: it has no place of its
 *   own (multiplayer.js moves it with `setPose`) and stays hidden until it gets a face with `show`.
 */
export function createFaceBall(scene, { placed = true } = {}) {
  const root = new THREE.Group();
  root.name = "face-ball";
  if (placed) {
    root.position.set(...FACE_BALL_POSITION);
    root.rotation.y = FACE_BALL_TURN;
  } else {
    root.rotation.order = "YXZ";
    root.visible = false;
  }
  const sign = makeSign();
  root.add(sign.sprite);
  scene.add(root);

  let head = null; // the group of the face (rebuilt for every new face)
  let headMesh = null; // what a click has to hit
  const raycaster = new THREE.Raycaster();

  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.28, roughness: 0.6, ...extra });
  const add = (parent, geometry, mat, [x, y, z] = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const dispose = (group) =>
    group.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });

  /** Show a face (see face.js). */
  function setFace(face) {
    if (head) {
      root.remove(head);
      dispose(head);
    }
    head = new THREE.Group();
    const skin = material(face.skin);
    const shade = material(darker(face.skin));
    const hair = material(face.hair);
    const sphere = (r, ...more) => new THREE.SphereGeometry(r, 28, 18, ...more);
    const width = face.width;
    // the skull: a ball, narrower or wider
    headMesh = add(head, sphere(R), skin);
    headMesh.scale.set(width, 1.06, 1);
    // eyes, brows, nose, mouth on the front (+z)
    for (const side of [-1, 1]) {
      const x = side * R * 0.36 * width;
      add(head, sphere(R * 0.17), material("#ffffff"), [x, R * 0.12, R * 0.86]).scale.set(1, 0.75, 0.6);
      add(head, sphere(R * 0.09), material(face.eyes), [x, R * 0.12, R * 0.94]);
      add(head, sphere(R * 0.04), material("#111111"), [x, R * 0.12, R * 0.985]);
      const brow = add(head, new THREE.BoxGeometry(R * 0.4, R * 0.07, R * 0.07), hair, [x, R * 0.38, R * 0.85]);
      brow.rotation.z = face.brows === 2 ? side * 0.35 : 0; // angled: the inner end lower
      if (face.brows === 1) brow.scale.y = 1.4; // arched: a little thicker
    }
    const noseSize = [R * 0.16, R * 0.24, R * 0.34][face.nose];
    const nose = add(head, new THREE.ConeGeometry(R * 0.11, noseSize, 14), shade, [0, -R * 0.08, R * 0.9 + noseSize * 0.3]);
    nose.rotation.x = Math.PI / 2;
    add(head, new THREE.BoxGeometry(R * 0.36, R * 0.05, R * 0.05), material(face.beard >= 2 ? "#f2c9c9" : darker(face.skin, 0.4)), [0, -R * 0.42, R * 0.9]);
    // hair: caps on the skull (tilted back so the forehead stays free), long hair also behind
    const cap = (radius, theta, tilt = -0.5) => {
      const m = add(head, sphere(radius, 0, Math.PI * 2, 0, theta), hair);
      m.scale.set(width, 1.06, 1);
      m.rotation.x = tilt;
      return m;
    };
    if (face.hairStyle === 1) cap(R * 1.02, Math.PI * 0.38);
    if (face.hairStyle === 2) cap(R * 1.07, Math.PI * 0.44);
    if (face.hairStyle === 3) {
      cap(R * 1.07, Math.PI * 0.44).rotation.z = 0.15;
      add(head, sphere(R * 0.4), hair, [-R * 0.45 * width, R * 0.85, R * 0.3]);
    }
    if (face.hairStyle === 4) {
      cap(R * 1.07, Math.PI * 0.44);
      const back = add(head, sphere(R * 1.09, 0, Math.PI, Math.PI * 0.3, Math.PI * 0.55), hair); // the back half, down to the shoulders
      back.scale.set(width, 1.3, 1.02);
      back.rotation.y = Math.PI; // the open side to the front
      back.position.y = -R * 0.2;
    }
    if (face.hairStyle === 5) {
      cap(R * 1.02, Math.PI * 0.38);
      add(head, new THREE.ConeGeometry(R * 0.2, R * 0.55, 12), hair, [0, R * 1.2, -R * 0.1]);
    }
    // beard: the lower front of the face
    if (face.beard === 1) {
      const m = add(head, sphere(R * 1.015, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.55, Math.PI * 0.4), material(face.hair, { transparent: true, opacity: 0.4 }));
      m.scale.set(width, 1.06, 1);
    }
    if (face.beard === 2) {
      add(head, sphere(R * 0.2), hair, [0, -R * 0.75, R * 0.65]).scale.set(1, 1.2, 0.8);
      add(head, new THREE.BoxGeometry(R * 0.5, R * 0.08, R * 0.08), hair, [0, -R * 0.3, R * 0.9]);
    }
    if (face.beard === 3) {
      const m = add(head, sphere(R * 1.05, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.6, Math.PI * 0.4), hair);
      m.scale.set(width, 1.06, 1);
    }
    root.add(head);
  }

  if (placed) {
    setFace(randomFace());
    sign.set("", DEFAULT_COUNTRY);
  }

  return {
    group: root,
    /** The player's own face, name and country (after the welcome screen). */
    setProfile(profile) {
      if (profile.face) setFace(profile.face);
      sign.set(displayName(profile, "short"), profile.country ?? DEFAULT_COUNTRY);
    },
    /** The face, name and country of another player (the name as it is to be shown). */
    show(face, name, country) {
      setFace(face);
      sign.set(name, country);
    },
    /** Hang the face at a place; it looks the way the camera of that player looks (yaw about the vertical axis, pitch up). */
    setPose(x, y, z, yaw, pitch) {
      root.position.set(x, y, z);
      root.rotation.set(-pitch, yaw + Math.PI, 0); // the face looks along +z, a camera along −z
    },
    setVisible(visible) {
      root.visible = visible && !!head;
    },
    /** Take the face out of the room. */
    remove() {
      scene.remove(root);
      dispose(root);
    },
    /** A click on the face throws the dice for a new face (true if it was hit). */
    handleClick(camera, ndc) {
      raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
      raycaster.far = FACE_BALL_CLICK_DISTANCE;
      if (!headMesh || raycaster.intersectObject(headMesh, false).length === 0) return false;
      setFace(randomFace());
      return true;
    },
  };
}
