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
import {
  PHYSICS_STEP,
  REST_LINEAR_SPEED,
  REST_SURFACE_SPEED,
} from "./physics-constants.js";

/** @type {typeof import("three")} */
const THREE = window.THREE;
if (!THREE) {
  throw new Error("THREE fehlt — src/entry.js muss vor billiard.js laden.");
}

/* ====================================================
   1. GLOBALE VARIABLEN & KONSTANTEN
==================================================== */
let scene, camera, renderer;
let balls = []; // { mesh, body, collider, pos, vel, radius, isCue, id, inPocket }
/** @type {Map<number, object>} Collider-Handle → Kugel */
const ballByCollider = new Map();
let cueBall = null;
let cueStickPivot, cueStickMesh, aimLine;

// Tisch-Parameter (WPA 9-Fuß) → table-constants.js
const CUSHION_H = CUSHION_NOSE_TO_BED;
const BALL_R = BALL_RADIUS_REAL;

const tableDimensions = {
  playW: PLAY_W,
  playL: PLAY_L,
  tableH: TABLE_H,
  cushionH: CUSHION_H,
};
const pocketSpecs = createPocketSpecs(tableDimensions);

// Zustand
let cameraMode = "fps"; // 'fps' oder 'overhead'
let aimAngle = 0; // Stoßrichtung −Z (Rack liegt in −Z)
let aimPitch = 0.12;
let selectedPower = 0.4; // 0.10 bis 1.0 (Standard: sanfte 40%)
let isCueMoving = false;
let cueStrikeAnim = 0; // Für visuelle Vorstoß-Animation
let cueRespawnTimer = null; // Timer für das Wiederaufstellen der weißen Kugel
let lastShotTime = 0; // Schutz gegen doppelt ausgelöste Stöße
let physics = null; // Rapier-Welt (physics-world.js)
let physicsAcc = 0; // Zeit-Akkumulator für feste Physik-Schritte

// Audio-Context für synthetische Kugel-Kollisionsgeräusche
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
   2. THREE.JS SZENE & ATMOSPHÄRE
==================================================== */
function init() {
  const container = document.getElementById("canvas-container");

  // 2.1 Szene & Nebel (Salon-Atmosphäre ohne störenden Staub/Schnee)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070a);
  scene.fog = new THREE.FogExp2(0x06070a, 0.07);

  // 2.2 Kamera
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

  // 2.4 Licht & Salon
  setupLightingAndRoom();

  // 2.5 Tisch & Taschen mit echten Löchern (Bauplan: table-blueprint.js)
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
    window.BilliardTableBlueprint.buildAuthenticTableWithHoles(
      scene,
      tableDims,
      { pocketSpecs }
    );

  // 2.5b Rapier-Welt aus genau dieser Geometrie
  if (!window.RAPIER) {
    throw new Error("Rapier fehlt — src/entry.js muss window.RAPIER vor billiard.js setzen.");
  }
  physics = createPhysicsWorld(
    window.RAPIER,
    colliderGeometries,
    pocketSpecs,
    TABLE_H,
    FELT_BED_DEPTH
  );

  // 2.6 Kugeln initialisieren
  setupBalls();

  // 2.7 Queue & Ziellinie
  setupCueAndAimLine();

  // 2.8 Events & UI
  setupControls();
  snapFpsCamera();

  // Animation Loop starten
  requestAnimationFrame(gameLoop);
}

/** FP-Kamera hinter der weißen Kugel, Blick entlang der Stoßrichtung (kein Lerp beim Start). */
function snapFpsCamera() {
  if (cameraMode !== "fps" || !cueBall) return;
  const camDist = 0.62;
  const camH = 0.25 + aimPitch * 0.45;
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
  // Schwaches, gedimmtes Grundlicht
  const ambLight = new THREE.AmbientLight(0x111622, 0.4);
  scene.add(ambLight);

  // Warmer Decken-Spot über dem Tisch
  const lampY = TABLE_H + 1.4;
  const spot = new THREE.SpotLight(0xffdfa4, 4.5);
  spot.position.set(0, lampY, 0);
  spot.angle = Math.PI / 3.4;
  spot.penumbra = 0.55;
  spot.decay = 1.4;
  spot.distance = 6.0;
  spot.castShadow = true;
  spot.shadow.mapSize.width = 2048;
  spot.shadow.mapSize.height = 2048;
  spot.shadow.bias = -0.0003;
  spot.target.position.set(0, TABLE_H, 0);
  scene.add(spot);
  scene.add(spot.target);

  // Glüh-Punktlicht an der Lampe
  const bulb = new THREE.PointLight(0xffa834, 1.2, 3.0);
  bulb.position.set(0, lampY - 0.05, 0);
  scene.add(bulb);

  // Lampenschirm (Klassisches Messing / Dunkelgrün)
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.22, 32, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0f291e,
      roughness: 0.3,
      metalness: 0.7,
      side: THREE.DoubleSide,
    })
  );
  shade.position.set(0, lampY + 0.08, 0);
  scene.add(shade);

  // Volumetrischer warmer Lichtkegel
  const coneHeight = 1.38;
  const coneR = Math.tan(spot.angle) * coneHeight * 0.95;
  const coneGeo = new THREE.ConeGeometry(coneR, coneHeight, 32, 1, true);
  coneGeo.translate(0, -coneHeight / 2, 0);
  const lightCone = new THREE.Mesh(
    coneGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffd290,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  lightCone.position.set(0, lampY, 0);
  scene.add(lightCone);

  // Dunkler Salon-Boden
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshStandardMaterial({ color: 0x08090d, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
}

/* ====================================================
   3. HOCHGLÄNZENDE KUGELN MIT REFLEXIONEN
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

  const sphereGeo = new THREE.SphereGeometry(BALL_R, 32, 32);

  // Satte, edle Poolfarben
  const ballColors = [
    0xf59e0b, 0x1d4ed8, 0xdc2626, 0x6d28d9, 0xea580c, 0x15803d, 0x881337,
    0x111827, 0xfacc15, 0x0284c7, 0xef4444, 0x8b5cf6, 0xf97316, 0x22c55e,
    0x4c0519,
  ];

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
      inPocket: false, // erst true, wenn die Kugel den Becherboden getroffen hat
    };
    balls.push(bObj);
    ballByCollider.set(collider.handle, bObj);
    return bObj;
  }

  // Weiße Kugel
  cueBall = createBall(0, PLAY_L * 0.28, 0xf8fafc, true, 0);

  // Dreiecks-Anordnung
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
      createBall(px, pz, ballColors[idx % ballColors.length], false, idx + 1);
      idx++;
    }
  }
}

/** Freien Platz für die weiße Kugel suchen (Standardpunkt, sonst weiter hinten). */
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
   4. FIRST-PERSON QUEUE & ZIELLINIE
==================================================== */
function setupCueAndAimLine() {
  cueStickPivot = new THREE.Group();
  scene.add(cueStickPivot);

  // Billardqueue aus Holz mit Verjüngung
  const stickGeo = new THREE.CylinderGeometry(0.0065, 0.015, 1.45, 24);
  stickGeo.translate(0, 0.725, 0);
  stickGeo.rotateX(Math.PI / 2);
  const cueMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    roughness: 0.4,
    metalness: 0.05,
  });
  cueStickMesh = new THREE.Mesh(stickGeo, cueMat);
  cueStickMesh.castShadow = true;
  cueStickPivot.add(cueStickMesh);

  // Blaue Kreidespitze
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0067, 0.0067, 0.025, 16),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 })
  );
  tip.translateZ(0.012);
  tip.rotateX(Math.PI / 2);
  cueStickMesh.add(tip);

  // Edle punktierte Ziellinie
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
   5. FEHLERFREIE & AUSBALANCIERTE STOSS-MECHANIK
==================================================== */
function fireCueStrike() {
  if (!cueBall || cueBall.inPocket || cueBall.pos.y < TABLE_H - 0.01) return;

  // Doppelt ausgelöste Events (Button+Leertaste, Touch+Maus) ignorieren
  const now = performance.now();
  if (now - lastShotTime < 300) return;
  lastShotTime = now;

  // Akustischer Klick
  playClackSound(selectedPower * 0.8, 900);

  // Sanft ausbalancierte Stoßkraft (Realistisches Rollverhalten statt Übergeschwindigkeit)
  const impulseStrength = 0.8 + selectedPower * 3.4;
  const dirX = -Math.sin(aimAngle);
  const dirZ = -Math.cos(aimAngle);

  // Impuls durch den Kugelmittelpunkt (kein Effet); Masse × Geschwindigkeit
  const m = cueBall.body.mass();
  cueBall.body.applyImpulse(
    { x: dirX * impulseStrength * m, y: 0, z: dirZ * impulseStrength * m },
    true
  );

  // Visuelle Schnapp-Animation des Queues
  cueStrikeAnim = 1.0;

  // Status UI aktualisieren
  updateStatusDisplay(true);
}

function updateStatusDisplay(moving) {
  isCueMoving = moving;
  const dot = document.getElementById("status-dot");
  const txt = document.getElementById("status-text");
  if (moving) {
    dot.className = "status-dot status-dot--moving";
    txt.innerText = "Kugeln rollen...";
    txt.className = "status-text status-text--moving";
  } else {
    dot.className = "status-dot status-dot--idle";
    txt.innerText = "Bereit zum Stoß";
    txt.className = "status-text status-text--idle";
  }
}

/* ====================================================
   6. INTERAKTIONEN, MAUSRAD-STEUERUNG & EVENTS
==================================================== */
function setupControls() {
  const container = renderer.domElement;
  let isMouseDown = false;
  let lastX = 0,
    lastY = 0;
  let totalDragDist = 0;

  // Power UI Helfer
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

  // MAUSRAD-STEUERUNG: Stoßkraft stufenlos & präzise einstellen
  window.addEventListener(
    "wheel",
    (e) => {
      // Nach oben scrollen (-deltaY) = mehr Kraft, nach unten (+deltaY) = weniger Kraft
      const delta = -Math.sign(e.deltaY) * 0.05;
      setPower(selectedPower + delta);
    },
    { passive: true }
  );

  // Direkter On-Screen Stoß-Button
  const fireBtn = document.getElementById("btn-fire-shot");
  fireBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fireCueStrike();
    fireBtn.blur(); // Fokus abgeben, damit die Leertaste nicht den Button erneut auslöst
  });

  // Maussteuerung (Klicken & Ziehen zum Zielen, Klick ohne Drag = Stoß)
  container.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      isMouseDown = true;
      totalDragDist = 0;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  window.addEventListener("mouseup", () => {
    if (isMouseDown) {
      // Wurde die Maus nur kurz geklickt (ohne Zieldrehung) -> Stoß ausführen!
      if (totalDragDist < 5) {
        fireCueStrike();
      }
    }
    isMouseDown = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isMouseDown) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    totalDragDist += Math.abs(dx) + Math.abs(dy);
    lastX = e.clientX;
    lastY = e.clientY;

    // Horizontales Zielen
    aimAngle -= dx * 0.0055;
    // Vertikale Neigung
    aimPitch = Math.max(0.04, Math.min(0.4, aimPitch + dy * 0.002));
  });

  // Tastatur-Steuerung: Pfeiltasten / A & D zum Zielen, Leertaste zum Stoßen
  window.addEventListener("keydown", (e) => {
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
    if (e.code === "KeyC") {
      toggleCamera();
    }
    if (e.code === "KeyR") {
      setupBalls();
    }
  });

  // Touch Steuerung für Mobile
  let touchX = 0;
  let touchMoved = false;
  container.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) {
        touchX = e.touches[0].clientX;
        touchMoved = false;
      }
    },
    { passive: true }
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchX;
        if (Math.abs(dx) > 3) touchMoved = true;
        touchX = e.touches[0].clientX;
        aimAngle -= dx * 0.006;
      }
    },
    { passive: true }
  );

  container.addEventListener("touchend", (e) => {
    e.preventDefault(); // verhindert die zusätzlich erzeugten Maus-Events
    if (!touchMoved) {
      fireCueStrike();
    }
  });

  // Header Buttons
  document.getElementById("btn-camera").addEventListener("click", toggleCamera);
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

function toggleCamera() {
  cameraMode = cameraMode === "fps" ? "overhead" : "fps";
  document.getElementById("cam-label").innerText =
    cameraMode === "fps" ? "FP Queue" : "Draufsicht";
  document.getElementById("aim-crosshair").style.display =
    cameraMode === "fps" ? "flex" : "none";
  cueStickPivot.visible = cameraMode === "fps";
  aimLine.visible = cameraMode === "fps";
}

/* ====================================================
   7. EXAKTE PHYSIK-SIMULATION (Kugeln, Banden, Taschen)
==================================================== */

/**
 * Kugel-Zustand aus dem Rapier-Körper in Optik und Spiel-Objekt übernehmen.
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

/** Kugel hat den Becherboden getroffen → zählt als versenkt. */
function onBallPocketed(b, pocketId) {
  if (b.inPocket) return;
  b.inPocket = true;
  console.info(
    `[Billiard] Kugel ${b.id} versenkt in ${pocketId} (Aufprall Becherboden, y=${b.pos.y.toFixed(3)})`
  );

  if (b.isCue) {
    cueRespawnTimer = setTimeout(() => {
      cueRespawnTimer = null;
      const spot = findFreeCueSpot();
      b.body.setTranslation({ x: spot.x, y: TABLE_H + BALL_R + 0.0005, z: spot.z }, true);
      b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      b.inPocket = false;
    }, 600);
  }
}

/**
 * Physik mit festem Zeitschritt (Rapier). Versenkt wird erst beim Aufprall im Becher.
 * @param {number} frameDt — Frame-Zeit in Sekunden
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
  if (steps === 16) physicsAcc = 0; // nach langem Hänger nicht aufholen

  let moving = false;
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    syncBallFromBody(b);

    // Streuner (aus dem Tisch gesprungen) zurück auf den Tisch
    if (!b.inPocket && (Math.abs(b.pos.x) > 1.2 || Math.abs(b.pos.z) > 1.8 || b.pos.y < 0.5)) {
      console.warn("[Billiard] Kugel außerhalb des Tisches, wird zurückgesetzt", b.id);
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

  const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
  lastTime = currentTime;

  // Physikschritt
  stepPhysics(dt);

  // Queue-Positionierung & Abstand angepasst an das Mausrad
  if (cueBall && cueStickPivot) {
    cueStickPivot.position.set(cueBall.pos.x, cueBall.pos.y, cueBall.pos.z);
    cueStickPivot.rotation.y = aimAngle;

    // Der Queue zieht sich proportional zum eingestellten Mausrad-Powerwert zurück!
    let cueDist = 0.05 + selectedPower * 0.28;
    if (cueStrikeAnim > 0) {
      // Stoß schnellt beim Treffen vor
      cueDist = THREE.MathUtils.lerp(0.012, cueDist, 1 - cueStrikeAnim);
      cueStrikeAnim = Math.max(0, cueStrikeAnim - dt * 6.5);
    }

    cueStickMesh.position.set(0, 0.015 + aimPitch * 0.1, cueDist);
    cueStickMesh.rotation.x = aimPitch;

    // Ziellinie an der Kugel ausrichten
    if (aimLine) {
      aimLine.position.set(
        cueBall.pos.x,
        cueBall.pos.y - BALL_R + 0.002,
        cueBall.pos.z
      );
      aimLine.rotation.y = aimAngle;
    }
  }

  // Kamera-Positionierung
  if (cameraMode === "fps" && cueBall) {
    const camDist = 0.62;
    const camH = 0.25 + aimPitch * 0.45;
    const targetX = cueBall.pos.x + Math.sin(aimAngle) * camDist;
    const targetZ = cueBall.pos.z + Math.cos(aimAngle) * camDist;
    const targetY = cueBall.pos.y + camH;

    camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.18);
    camera.lookAt(
      cueBall.pos.x - Math.sin(aimAngle) * 1.8,
      cueBall.pos.y,
      cueBall.pos.z - Math.cos(aimAngle) * 1.8
    );
  } else if (cameraMode === "overhead") {
    camera.position.lerp(new THREE.Vector3(0, TABLE_H + 2.6, 0.01), 0.08);
    camera.lookAt(0, TABLE_H, 0);
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
