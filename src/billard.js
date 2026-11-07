"use strict";

import {
  PLAY_L,
  PLAY_W,
  TABLE_H,
  BALL_RADIUS_REAL,
  CUSHION_NOSE_TO_BED,
  CUSHION_PROFILE_WIDTH,
  RAIL_WOOD_DEPTH,
  FELT_BED_DEPTH,
} from "./table-constants.js";
import { createPocketSpecs } from "./pocket-spec.js";
import { createPhysicsWorld } from "./physics-world.js";
import { createCeilingLamps } from "./ceiling-lamps.js";
import { createRoom } from "./room.js";
import { createCueModel, CUE_LENGTH } from "./cue-model.js";
import {
  CUE_FOLLOW_THROUGH_TIME,
  CUE_RELAX_TIME,
  CUE_RETURN_TIME,
  CUE_CARRY_TIP,
  CUE_CARRY_DIRECTION,
  CUE_SWAY_AMPLITUDE,
  CUE_SWAY_SPEED,
} from "./cue-constants.js";
import {
  FREE_CAM_SPEED,
  FREE_CAM_LOOK_SENSITIVITY,
  FREE_CAM_MIN_Y,
  FREE_CAM_START_POSITION,
  FREE_CAM_START_TARGET,
  FREE_CAM_ROOM_MARGIN,
  FP_CAM_DISTANCE,
  FP_CAM_HEIGHT,
  SHOT_REST_DELAY,
  ROOM_LENGTH,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  ROOM_AMBIENT_COLOR,
  ROOM_AMBIENT_INTENSITY,
} from "./room-constants.js";
import { t, onLanguageChange } from "./i18n/index.js";
import {
  PHYSICS_STEP,
  REST_LINEAR_SPEED,
  REST_SURFACE_SPEED,
} from "./physics-constants.js";

/** @type {typeof import("three")} */
const THREE = window.THREE;
if (!THREE) {
  throw new Error("THREE is missing — src/entry.js must load before billard.js.");
}

/* ====================================================
   1. GLOBAL VARIABLES & CONSTANTS
==================================================== */
let scene, camera, renderer;
let balls = []; // { mesh, body, collider, pos, vel, radius, isCue, id, inPocket }
/** @type {Map<number, object>} collider handle → ball */
const ballByCollider = new Map();
let cueBall = null;
let cueStickPivot, cueStickMesh, aimLine;

// Table parameters (WPA 9-foot) → table-constants.js
const CUSHION_H = CUSHION_NOSE_TO_BED;
const BALL_R = BALL_RADIUS_REAL;

const tableDimensions = {
  playW: PLAY_W,
  playL: PLAY_L,
  tableH: TABLE_H,
  cushionH: CUSHION_H,
};
const pocketSpecs = createPocketSpecs(tableDimensions);

// State
let cameraMode = "fps"; // 'fps' (cue view) or 'free' (free fly camera)
let aimAngle = 0; // shot direction −Z (the rack lies in −Z)
let aimPitch = 0.12;
let selectedPower = 0.4; // 0.10 to 1.0 (default: gentle 40%)
let isCueMoving = false;
/** True from the shot until the table has come to rest; the cue and the camera stay behind. */
let shotInProgress = false;
let shotRestTimer = 0;
let strikeStartDistance = 0; // how far the cue was pulled back when the shot was taken
let cueTipDistance = 0; // tip distance for this frame (computed before the camera update)
let cueShotTime = 0; // seconds since the shot
let cueRelax = 0; // 0 = aiming/strike pose, 1 = relaxed hold (linear; eased when applied)
const heldCameraPosition = new THREE.Vector3();
const heldCameraQuaternion = new THREE.Quaternion();
let cueStrikeAnim = 0; // drives the cue strike animation
let cueRespawnTimer = null; // timer for re-spotting the cue ball
let lastShotTime = 0; // guard against double-triggered shots
/** 15 object balls, all different; no. 8 stays black. The HUD uses the same colors. */
const BALL_COLORS = [
  0xfacc15, // 1 yellow
  0x1d4ed8, // 2 blue
  0xdc2626, // 3 red
  0x7c3aed, // 4 purple
  0xf97316, // 5 orange
  0x15803d, // 6 green
  0x7f1d1d, // 7 maroon
  0x111827, // 8 black
  0x38bdf8, // 9 light blue
  0xf472b6, // 10 pink
  0x14b8a6, // 11 teal
  0x92400e, // 12 brown
  0xa3e635, // 13 lime
  0x94a3b8, // 14 gray
  0xd946ef, // 15 magenta
];

/** "playing" | "won" | "lost" — the black 8 must be pocketed last */
let gameState = "playing";
const BLACK_BALL_ID = 8;
/** Ball numbers in rack position order; the 8 sits in the middle of the third row. */
const RACK_ORDER = [1, 2, 3, 4, 8, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];

/** @type {typeof balls} pocketed balls, removed after the physics step */
const pendingRemoval = [];
let physics = null; // Rapier world (physics-world.js)
let physicsAcc = 0; // time accumulator for fixed physics steps

// Audio context for synthetic ball collision sounds
let audioCtx = null;
function playClackSound(volume = 0.5, pitch = 800) {
  try {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      150,
      audioCtx.currentTime + 0.06
    );
    gain.gain.setValueAtTime(
      Math.min(volume, 1.0) * 0.45,
      audioCtx.currentTime
    );
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.07);
  } catch (e) {
    /* ignore */
  }
}

/* ====================================================
   2. THREE.JS SCENE & ATMOSPHERE
==================================================== */
function init() {
  const container = document.getElementById("canvas-container");

  // 2.1 Scene & fog (backroom atmosphere without distracting dust/snow)
  scene = new THREE.Scene();
  // (background and linear smoke fog are set up in createRoom)

  // 2.2 Camera
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.05,
    50
  );
  camera.position.set(0, TABLE_H + 1.2, 2.0);

  // 2.3 Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  // 2.4 Light & backroom
  setupLightingAndRoom();

  // 2.5 Table & pockets with real holes (blueprint: table-blueprint.js)
  const tableDims = {
    playL: PLAY_L,
    playW: PLAY_W,
    tableH: TABLE_H,
    railH: CUSHION_NOSE_TO_BED,
    rubberThick: CUSHION_PROFILE_WIDTH,
    railThick: RAIL_WOOD_DEPTH,
    feltDepth: FELT_BED_DEPTH,
  };
  const colliderGeometries =
    window.BillardTableBlueprint.buildAuthenticTableWithHoles(
      scene,
      tableDims,
      { pocketSpecs }
    );

  // 2.5b Rapier world built from exactly this geometry
  if (!window.RAPIER) {
    throw new Error("Rapier is missing — src/entry.js must set window.RAPIER before billard.js.");
  }
  physics = createPhysicsWorld(
    window.RAPIER,
    colliderGeometries,
    pocketSpecs,
    TABLE_H,
    FELT_BED_DEPTH
  );

  // 2.6 Initialize balls
  setupBalls();

  // 2.7 Cue & aim line
  setupCueAndAimLine();

  // 2.8 Events & UI
  setupControls();
  renderCameraLabel();
  snapFpsCamera();

  // Start the animation loop
  requestAnimationFrame(gameLoop);
}

/** First-person camera behind the cue ball, looking along the shot direction (no lerp at start). */
function snapFpsCamera() {
  if (cameraMode !== "fps" || !cueBall) return;
  const camDist = FP_CAM_DISTANCE;
  const camH = FP_CAM_HEIGHT + aimPitch * 0.45;
  camera.position.set(
    cueBall.pos.x + Math.sin(aimAngle) * camDist,
    cueBall.pos.y + camH,
    cueBall.pos.z + Math.cos(aimAngle) * camDist
  );
  camera.lookAt(
    cueBall.pos.x - Math.sin(aimAngle) * 1.8,
    cueBall.pos.y,
    cueBall.pos.z - Math.cos(aimAngle) * 1.8
  );
}

function setupLightingAndRoom() {
  // Weak, dimmed ambient light
  const ambLight = new THREE.AmbientLight(ROOM_AMBIENT_COLOR, ROOM_AMBIENT_INTENSITY);
  scene.add(ambLight);

  // Three identical ceiling lamps above the table (parameters: room-constants.js)
  createCeilingLamps(scene, TABLE_H);

  // Room: carpet floor, cream walls, wooden ceiling + smoke fog
  createRoom(scene);
}

/* ====================================================
   3. GLOSSY BALLS WITH REFLECTIONS
==================================================== */
function setupBalls() {
  if (cueRespawnTimer) {
    clearTimeout(cueRespawnTimer);
    cueRespawnTimer = null;
  }
  balls.forEach((b) => {
    scene.remove(b.mesh);
    if (physics && b.body) physics.removeBall(b.body);
  });
  balls = [];
  ballByCollider.clear();
  pendingRemoval.length = 0;
  clearPocketedHud();
  hideGameOver();
  shotInProgress = false;
  cueRelax = 0;

  const sphereGeo = new THREE.SphereGeometry(BALL_R, 32, 32);

  function createBall(x, z, colorHex, isCue = false, id = 0) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.03,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 0.98,
    });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x, TABLE_H + BALL_R, z);
    scene.add(mesh);

    const { body, collider } = physics.addBall(
      { x, y: TABLE_H + BALL_R + 0.0005, z },
      BALL_R
    );
    const bObj = {
      mesh,
      body,
      collider,
      pos: new THREE.Vector3(x, TABLE_H + BALL_R, z),
      vel: new THREE.Vector3(0, 0, 0),
      radius: BALL_R,
      isCue,
      id,
      color: colorHex,
      inPocket: false, // true only once the ball has hit the cup floor
    };
    balls.push(bObj);
    ballByCollider.set(collider.handle, bObj);
    return bObj;
  }

  // Cue ball
  cueBall = createBall(0, PLAY_L * 0.28, 0xf8fafc, true, 0);

  // Triangle rack
  const startZ = -PLAY_L * 0.22;
  const rows = 5;
  let idx = 0;
  const rowGap = BALL_R * Math.sqrt(3) + 0.0008;

  for (let r = 0; r < rows; r++) {
    const count = r + 1;
    const startX = -((count - 1) * BALL_R * 1.02);
    for (let c = 0; c < count; c++) {
      const px = startX + c * (BALL_R * 2.04);
      const pz = startZ - r * rowGap;
      const number = RACK_ORDER[idx];
      createBall(px, pz, BALL_COLORS[number - 1], false, number);
      idx++;
    }
  }
}

/** Find a free spot for the cue ball (default spot, otherwise further back). */
function findFreeCueSpot() {
  const minDistSq = (BALL_R * 2.1) ** 2;
  const isFree = (x, z) =>
    balls.every(
      (o) =>
        o.isCue || o.inPocket || (o.pos.x - x) ** 2 + (o.pos.z - z) ** 2 > minDistSq
    );
  const baseZ = PLAY_L * 0.28;
  const maxZ = PLAY_L * 0.45;
  for (let z = baseZ; z <= maxZ; z += BALL_R * 0.5) {
    for (const x of [0, BALL_R * 2.5, -BALL_R * 2.5, BALL_R * 5, -BALL_R * 5]) {
      if (isFree(x, z)) return { x, z };
    }
  }
  return { x: 0, z: baseZ };
}

/* ====================================================
   4. FIRST-PERSON CUE & AIM LINE
==================================================== */
function setupCueAndAimLine() {
  cueStickPivot = new THREE.Group();
  scene.add(cueStickPivot);

  // The cue: two wooden parts, white ferrule, pink rubber tip (cue-model.js)
  cueStickMesh = createCueModel();
  cueStickPivot.add(cueStickMesh);

  // Elegant dotted aim line
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.2)];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
  aimLine = new THREE.Line(
    lineGeo,
    new THREE.LineDashedMaterial({
      color: 0xfde047,
      dashSize: 0.045,
      gapSize: 0.035,
      transparent: true,
      opacity: 0.75,
    })
  );
  aimLine.computeLineDistances();
  scene.add(aimLine);
}

/* ====================================================
   5. SHOT MECHANICS
==================================================== */
const _cueQuatAim = new THREE.Quaternion();
const _cueQuatCarry = new THREE.Quaternion();
const _cueEuler = new THREE.Euler(0, 0, 0, "YXZ");
const _pivotInverse = new THREE.Quaternion();
const _cueCarryPos = new THREE.Vector3();
const _cueCarryDir = new THREE.Vector3();
const _cueForward = new THREE.Vector3(0, 0, 1);

/**
 * Blend between the aiming/strike pose (0) and the relaxed hold (1). The hold is active a moment
 * after the shot until the table is still, and always while the free camera is in use.
 */
function updateCueRelax(dt) {
  if (cameraMode === "free") {
    cueRelax = Math.min(1, cueRelax + dt / CUE_RELAX_TIME);
  } else if (shotInProgress) {
    cueShotTime += dt;
    if (cueShotTime > CUE_FOLLOW_THROUGH_TIME) {
      cueRelax = Math.min(1, cueRelax + dt / CUE_RELAX_TIME);
    }
  } else {
    cueRelax = Math.max(0, cueRelax - dt / CUE_RETURN_TIME);
  }
}

/**
 * Place the cue (call after the camera has been updated for this frame).
 * Aiming/strike pose: tip `tipDistance` behind the ball center, butt rising behind it.
 * Relaxed hold: the cue is carried in the lower right of the camera view, tip pointing diagonally
 * into the scene; the two poses are blended smoothly (position lerp, rotation slerp).
 */
function poseCue(tipDistance) {
  const eased = cueRelax * cueRelax * (3 - 2 * cueRelax);

  // Aiming pose in the pivot's local space (cue origin = tip, +z towards the player)
  _cueEuler.set(-aimPitch, 0, 0);
  _cueQuatAim.setFromEuler(_cueEuler);
  cueStickMesh.position.set(0, 0.015 + aimPitch * 0.1, tipDistance);
  cueStickMesh.quaternion.copy(_cueQuatAim);
  if (eased <= 0) return;

  // Carried pose: defined in camera space, converted into the pivot's local space
  const sway = Math.sin((performance.now() / 1000) * CUE_SWAY_SPEED) * CUE_SWAY_AMPLITUDE;
  camera.updateMatrixWorld(true);
  cueStickPivot.updateMatrixWorld(true);
  _cueCarryPos.set(...CUE_CARRY_TIP).applyMatrix4(camera.matrixWorld);
  _cueCarryDir.set(CUE_CARRY_DIRECTION[0] + sway, CUE_CARRY_DIRECTION[1] + sway * 0.5, CUE_CARRY_DIRECTION[2]).normalize();
  _cueCarryDir.transformDirection(camera.matrixWorld);
  _cueQuatCarry.setFromUnitVectors(_cueForward, _cueCarryDir);
  cueStickPivot.worldToLocal(_cueCarryPos);
  _pivotInverse.copy(cueStickPivot.quaternion).invert(); // pivot: rotates around y only, no parent
  _cueQuatCarry.premultiply(_pivotInverse);

  cueStickMesh.position.lerp(_cueCarryPos, eased);
  cueStickMesh.quaternion.slerp(_cueQuatCarry, eased);
}

/** Distance from the ball center to the cue tip: grows with the selected power. */
function pulledCueDistance() {
  return BALL_R + 0.02 + selectedPower * 0.28;
}

function fireCueStrike() {
  if (gameState !== "playing" || cameraMode !== "fps") return; // the free camera only observes
  if (shotInProgress) return; // wait until the table is still
  if (!cueBall || cueBall.inPocket || cueBall.pos.y < TABLE_H - 0.01) return;

  // Ignore double-triggered events (button+space, touch+mouse)
  const now = performance.now();
  if (now - lastShotTime < 300) return;
  lastShotTime = now;

  // Audible click
  playClackSound(selectedPower * 0.8, 900);

  // Gently balanced shot strength (realistic rolling instead of excess speed)
  const impulseStrength = 0.8 + selectedPower * 3.4;
  const dirX = -Math.sin(aimAngle);
  const dirZ = -Math.cos(aimAngle);

  // Impulse through the ball center (no spin); mass × velocity
  const m = cueBall.body.mass();
  cueBall.body.applyImpulse(
    { x: dirX * impulseStrength * m, y: 0, z: dirZ * impulseStrength * m },
    true
  );

  // Visual snap animation of the cue
  cueStrikeAnim = 1.0;
  strikeStartDistance = pulledCueDistance();
  cueShotTime = 0;

  // The camera and the cue stay where they are until everything has come to rest
  shotInProgress = true;
  shotRestTimer = 0;
  heldCameraPosition.copy(camera.position);
  heldCameraQuaternion.copy(camera.quaternion);

  // Update the status UI
  updateStatusDisplay(true);
}

function updateStatusDisplay(moving) {
  isCueMoving = moving;
  const dot = document.getElementById("status-dot");
  const txt = document.getElementById("status-text");
  if (moving) {
    dot.className = "status-dot status-dot--moving";
    txt.innerText = t("status.rolling");
    txt.className = "status-text status-text--moving";
  } else {
    dot.className = "status-dot status-dot--idle";
    txt.innerText = t("status.ready");
    txt.className = "status-text status-text--idle";
  }
}

/* ====================================================
   6. INTERACTION, MOUSE WHEEL & EVENTS
==================================================== */
function setupControls() {
  const container = renderer.domElement;
  let isMouseDown = false;
  let lastX = 0,
    lastY = 0;
  let totalDragDist = 0;

  // Power UI helpers
  const slider = document.getElementById("power-slider");
  const powerFill = document.getElementById("power-fill");
  const powerPct = document.getElementById("power-percent");

  function setPower(val) {
    selectedPower = Math.max(0.1, Math.min(1.0, val));
    const pct = Math.round(selectedPower * 100);
    slider.value = pct;
    powerFill.style.width = pct + "%";
    powerPct.innerText = pct + "%";
  }

  slider.addEventListener("input", (e) => {
    setPower(e.target.value / 100);
  });

  // MOUSE WHEEL: set shot power continuously and precisely
  window.addEventListener(
    "wheel",
    (e) => {
      if (cameraMode !== "fps") return;
      // Scroll up (-deltaY) = more power, scroll down (+deltaY) = less power
      const delta = -Math.sign(e.deltaY) * 0.05;
      setPower(selectedPower + delta);
    },
    { passive: true }
  );

  // On-screen shoot button
  const fireBtn = document.getElementById("btn-fire-shot");
  fireBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fireCueStrike();
    fireBtn.blur(); // give up focus so the space bar does not trigger the button again
  });

  // Mouse control (click & drag to aim, click without drag = shot)
  container.addEventListener("mousedown", (e) => {
    if (cameraMode === "free") {
      // Free camera: drag to look; a click also tries to capture the pointer
      if (e.button === 0) {
        freeLookDragging = true;
        requestPointerLockSafe();
      }
      return;
    }
    if (e.button === 0) {
      isMouseDown = true;
      totalDragDist = 0;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  window.addEventListener("mouseup", () => {
    freeLookDragging = false;
    if (isMouseDown && cameraMode === "fps") {
      // Mouse was only clicked briefly (no aim rotation) -> take the shot
      if (totalDragDist < 5) {
        fireCueStrike();
      }
    }
    isMouseDown = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (cameraMode === "free") {
      // Mouse look: pointer locked (relative movement) or while dragging
      if (document.pointerLockElement || freeLookDragging) {
        freeYaw -= e.movementX * FREE_CAM_LOOK_SENSITIVITY;
        freePitch -= e.movementY * FREE_CAM_LOOK_SENSITIVITY;
        freePitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, freePitch));
      }
      return;
    }
    if (!isMouseDown) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    totalDragDist += Math.abs(dx) + Math.abs(dy);
    lastX = e.clientX;
    lastY = e.clientY;

    // Horizontal aiming
    aimAngle -= dx * 0.0055;
    // Vertical tilt
    aimPitch = Math.max(0.04, Math.min(0.4, aimPitch + dy * 0.002));
  });

  // Keyboard: C switches the camera, R resets; in cue view arrow keys / A & D aim and space
  // shoots; in free camera mode WASD move, space goes up and shift goes down.
  window.addEventListener("keydown", (e) => {
    heldKeys.add(e.code);
    if (e.code === "KeyC" && !e.repeat) {
      toggleCamera();
      return;
    }
    if (e.code === "KeyR" && !e.repeat) {
      setupBalls();
      return;
    }
    if (cameraMode === "free") {
      if (e.code === "Space") e.preventDefault(); // no page scroll / button activation
      return;
    }
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      aimAngle += 0.05;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
      aimAngle -= 0.05;
    }
    if (e.code === "ArrowUp" || e.code === "KeyW") {
      setPower(selectedPower + 0.05);
    }
    if (e.code === "ArrowDown" || e.code === "KeyS") {
      setPower(selectedPower - 0.05);
    }
    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) fireCueStrike();
    }
  });
  window.addEventListener("keyup", (e) => heldKeys.delete(e.code));
  window.addEventListener("blur", () => heldKeys.clear());

  // Touch control for mobile
  let touchX = 0;
  let touchMoved = false;
  container.addEventListener(
    "touchstart",
    (e) => {
      if (cameraMode === "fps" && e.touches.length === 1) {
        touchX = e.touches[0].clientX;
        touchMoved = false;
      }
    },
    { passive: true }
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (cameraMode === "fps" && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchX;
        if (Math.abs(dx) > 3) touchMoved = true;
        touchX = e.touches[0].clientX;
        aimAngle -= dx * 0.006;
      }
    },
    { passive: true }
  );

  container.addEventListener("touchend", (e) => {
    e.preventDefault(); // prevents the additionally synthesized mouse events
    if (cameraMode === "fps" && !touchMoved) {
      fireCueStrike();
    }
  });

  // Header Buttons
  document.getElementById("btn-camera").addEventListener("click", toggleCamera);
  document.getElementById("btn-restart").addEventListener("click", () => {
    setupBalls();
    updateStatusDisplay(false);
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    setupBalls();
    updateStatusDisplay(false);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function renderCameraLabel() {
  document.getElementById("cam-label").innerText = t(
    cameraMode === "fps" ? "camera.fp" : "camera.free"
  );
}

/** Free camera view angles (radians); the camera position itself is `camera.position`. */
let freeYaw = 0;
let freePitch = 0;
let freeLookDragging = false;
/** Where the free camera was left when switching back to the cue view. */
const freeSavedPosition = new THREE.Vector3();
let freePoseSaved = false;
/** Currently held keys (KeyboardEvent.code) for the free camera movement. */
const heldKeys = new Set();

function requestPointerLockSafe() {
  try {
    const result = renderer.domElement.requestPointerLock?.();
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    /* pointer lock unavailable — dragging with the mouse still looks around */
  }
}

function toggleCamera() {
  cameraMode = cameraMode === "fps" ? "free" : "fps";
  const free = cameraMode === "free";

  if (free) {
    // First time: the default observer pose; afterwards: where the free camera was left
    if (!freePoseSaved) {
      camera.position.set(...FREE_CAM_START_POSITION);
      camera.lookAt(...FREE_CAM_START_TARGET);
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
      freeYaw = euler.y;
      freePitch = euler.x;
    } else {
      camera.position.copy(freeSavedPosition);
    }
    requestPointerLockSafe();
  } else {
    freeSavedPosition.copy(camera.position);
    freePoseSaved = true;
    freeLookDragging = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  renderCameraLabel();
  document.getElementById("aim-crosshair").style.display = free ? "none" : "flex";
}

/** Move and rotate the free camera: WASD, space = up, shift = down, mouse look. */
function updateFreeCamera(dt) {
  camera.rotation.set(freePitch, freeYaw, 0, "YXZ");

  const forward = new THREE.Vector3(-Math.sin(freeYaw), 0, -Math.cos(freeYaw));
  const right = new THREE.Vector3(Math.cos(freeYaw), 0, -Math.sin(freeYaw));
  const move = new THREE.Vector3();
  if (heldKeys.has("KeyW")) move.add(forward);
  if (heldKeys.has("KeyS")) move.sub(forward);
  if (heldKeys.has("KeyD")) move.add(right);
  if (heldKeys.has("KeyA")) move.sub(right);
  if (heldKeys.has("Space")) move.y += 1;
  if (heldKeys.has("ShiftLeft") || heldKeys.has("ShiftRight")) move.y -= 1;

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(FREE_CAM_SPEED * dt);
    camera.position.add(move);
    // Stay inside the room
    const m = FREE_CAM_ROOM_MARGIN;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -ROOM_WIDTH / 2 + m, ROOM_WIDTH / 2 - m);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -ROOM_LENGTH / 2 + m, ROOM_LENGTH / 2 - m);
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, FREE_CAM_MIN_Y, ROOM_HEIGHT - m);
  }
}

/* ====================================================
   7. PHYSICS (balls, cushions, pockets)
==================================================== */

/**
 * Copy the ball state from the Rapier body to the mesh and the game object.
 * @param {typeof balls[number]} b
 */
function syncBallFromBody(b) {
  const t = b.body.translation();
  const v = b.body.linvel();
  const q = b.body.rotation();
  b.pos.set(t.x, t.y, t.z);
  b.vel.set(v.x, v.y, v.z);
  b.mesh.position.copy(b.pos);
  b.mesh.quaternion.set(q.x, q.y, q.z, q.w);
}

/** Show pocketed balls as round circles in the ball color. */
function addPocketedToHud(b) {
  const host = document.getElementById("pocketed-balls");
  if (!host) return;
  const dot = document.createElement("span");
  dot.className = "pocketed-ball";
  dot.style.backgroundColor = "#" + b.color.toString(16).padStart(6, "0");
  dot.dataset.ballId = String(b.id);
  dot.title = t("pocketed.ball", { n: b.id });
  host.appendChild(dot);
}

function clearPocketedHud() {
  const host = document.getElementById("pocketed-balls");
  if (host) host.replaceChildren();
}

/** Show the end of the game; shots are blocked until the balls are racked again. */
function endGame(won) {
  gameState = won ? "won" : "lost";
  const overlay = document.getElementById("game-over");
  if (!overlay) return;
  overlay.classList.toggle("game-over--won", won);
  renderGameOver();
  overlay.hidden = false;
}

/** (Re-)render the game-over texts in the current language. */
function renderGameOver() {
  if (gameState === "playing") return;
  const key = gameState === "won" ? "game.won" : "game.lost";
  document.getElementById("game-over-title").textContent = t(`${key}.title`);
  document.getElementById("game-over-text").textContent = t(`${key}.reason`);
}

/** Re-render all dynamic (JS-generated) texts after a language change. */
function renderDynamicTexts() {
  updateStatusDisplay(isCueMoving);
  renderCameraLabel();
  renderGameOver();
  document.querySelectorAll(".pocketed-ball").forEach((dot) => {
    dot.title = t("pocketed.ball", { n: dot.dataset.ballId });
  });
}
onLanguageChange(renderDynamicTexts);

function hideGameOver() {
  gameState = "playing";
  const overlay = document.getElementById("game-over");
  if (overlay) overlay.hidden = true;
}

/** Remove a pocketed object ball completely (body, mesh, bookkeeping). */
function removeBall(b) {
  physics.removeBall(b.body);
  scene.remove(b.mesh);
  b.mesh.material.dispose();
  ballByCollider.delete(b.collider.handle);
  const i = balls.indexOf(b);
  if (i >= 0) balls.splice(i, 1);
}

/** The ball hit the cup floor → counts as pocketed. */
function onBallPocketed(b, pocketId) {
  if (b.inPocket) return;
  b.inPocket = true;
  console.info(
    `[Backroom Billard] ball ${b.id} pocketed in ${pocketId} (cup floor impact, y=${b.pos.y.toFixed(3)})`
  );

  if (!b.isCue) {
    addPocketedToHud(b);
    pendingRemoval.push(b); // remove only after the physics step
    if (b.id === BLACK_BALL_ID && gameState === "playing") {
      // Black 8: only allowed as the LAST ball, otherwise the game is lost
      const othersLeft = balls.some(
        (o) => !o.isCue && o.id !== BLACK_BALL_ID && !o.inPocket
      );
      endGame(!othersLeft);
    }
    return;
  }

  // Cue ball: re-spot on a free spot after a short pause
  cueRespawnTimer = setTimeout(() => {
    cueRespawnTimer = null;
    const spot = findFreeCueSpot();
    b.body.setTranslation({ x: spot.x, y: TABLE_H + BALL_R + 0.0005, z: spot.z }, true);
    b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    b.inPocket = false;
  }, 600);
}

/**
 * Physics with a fixed time step (Rapier). A ball only counts as pocketed on impact in the cup.
 * @param {number} frameDt — frame time in seconds
 */
function stepPhysics(frameDt) {
  physicsAcc += frameDt;
  let steps = 0;
  while (physicsAcc >= PHYSICS_STEP && steps < 16) {
    physics.world.step(physics.eventQueue);
    physics.eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const pocketId = physics.cupFloors.get(h1) ?? physics.cupFloors.get(h2);
      if (!pocketId) return;
      const ball = ballByCollider.get(h1) ?? ballByCollider.get(h2);
      if (ball) onBallPocketed(ball, pocketId);
    });
    physicsAcc -= PHYSICS_STEP;
    steps++;
  }
  if (steps === 16) physicsAcc = 0; // do not catch up after a long stall

  // Delete pocketed object balls from the cup
  while (pendingRemoval.length) removeBall(pendingRemoval.pop());

  let moving = false;
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    syncBallFromBody(b);

    // Stray ball (jumped off the table): put it back on the table
    if (!b.inPocket && (Math.abs(b.pos.x) > 1.2 || Math.abs(b.pos.z) > 1.8 || b.pos.y < 0.5)) {
      console.warn("[Backroom Billard] ball outside the table, resetting it", b.id);
      const spot = findFreeCueSpot();
      b.body.setTranslation({ x: spot.x, y: TABLE_H + BALL_R + 0.0005, z: spot.z }, true);
      b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      continue;
    }

    const lin = b.body.linvel();
    const ang = b.body.angvel();
    const speed = Math.hypot(lin.x, lin.y, lin.z);
    const surface = Math.hypot(ang.x, ang.y, ang.z) * BALL_R;
    const onTable = b.pos.y > TABLE_H - 0.01;
    if (onTable && speed < REST_LINEAR_SPEED && surface < REST_SURFACE_SPEED) {
      b.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
      b.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    } else if (!b.inPocket && (speed > 0.02 || !onTable)) {
      moving = true;
    }
  }

  if (moving !== isCueMoving) {
    updateStatusDisplay(moving);
  }
}

/* ====================================================
   8. GAME LOOP
==================================================== */
let lastTime = performance.now();

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop);

  const frameSeconds = (currentTime - lastTime) / 1000;
  const dt = Math.min(frameSeconds, 0.033);
  lastTime = currentTime;

  // Physics step
  stepPhysics(dt);

  // The table is still for a moment → the cue camera may return to the shot position
  if (shotInProgress) {
    if (!isCueMoving && cueBall && !cueBall.inPocket) {
      shotRestTimer += dt;
      if (shotRestTimer >= SHOT_REST_DELAY) shotInProgress = false;
    } else {
      shotRestTimer = 0;
    }
  }

  // Cue positioning & distance adjusted to the selected power
  if (cueBall && cueStickPivot) {
    // After the shot the cue stays where it struck; it returns once the table is still
    if (!shotInProgress) {
      cueStickPivot.position.set(cueBall.pos.x, cueBall.pos.y, cueBall.pos.z);
      cueStickPivot.rotation.y = aimAngle;
    }
    cueStickPivot.visible = true; // also visible with the free camera (carried)

    // The cue pulls back in proportion to the selected power
    let cueDist = pulledCueDistance();
    if (shotInProgress) {
      // The strike snaps forward to the ball, then the cue stays there
      cueStrikeAnim = Math.max(0, cueStrikeAnim - dt * 6.5);
      cueDist = THREE.MathUtils.lerp(strikeStartDistance, BALL_R + 0.001, 1 - cueStrikeAnim);
    }

    cueTipDistance = cueDist;

    // Align the aim line with the ball
    if (aimLine) {
      aimLine.visible = cameraMode === "fps" && !shotInProgress;
      aimLine.position.set(
        cueBall.pos.x,
        cueBall.pos.y - BALL_R + 0.002,
        cueBall.pos.z
      );
      aimLine.rotation.y = aimAngle;
    }
  }

  // Camera positioning
  if (cameraMode === "fps" && cueBall && shotInProgress) {
    // Do not follow the balls: stay behind the cue where the shot was taken
    camera.position.copy(heldCameraPosition);
    camera.quaternion.copy(heldCameraQuaternion);
  } else if (cameraMode === "fps" && cueBall) {
    const camDist = FP_CAM_DISTANCE;
    const camH = FP_CAM_HEIGHT + aimPitch * 0.45;
    const targetX = cueBall.pos.x + Math.sin(aimAngle) * camDist;
    const targetZ = cueBall.pos.z + Math.cos(aimAngle) * camDist;
    const targetY = cueBall.pos.y + camH;

    camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.18);
    camera.lookAt(
      cueBall.pos.x - Math.sin(aimAngle) * 1.8,
      cueBall.pos.y,
      cueBall.pos.z - Math.cos(aimAngle) * 1.8
    );
  } else if (cameraMode === "free") {
    updateFreeCamera(Math.min(frameSeconds, 0.1)); // real frame time, so the speed does not depend on the physics cap
  }

  // The cue is placed after the camera so a carried cue never lags behind it
  if (cueBall && cueStickPivot) {
    updateCueRelax(dt);
    poseCue(cueTipDistance);
  }

  renderer.render(scene, camera);
}

function scheduleInit() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
scheduleInit();
