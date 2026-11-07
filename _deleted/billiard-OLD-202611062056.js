"use strict";

/* ====================================================
   1. GLOBALE VARIABLEN & KONSTANTEN
==================================================== */
let scene, camera, renderer;
/** @type {THREE.CubeTexture | null} PMREM-Umgebung für PBR-Reflexionen (Fotostudio-HDR) */
let studioEnvMap = null;
let balls = []; // { mesh, pos, vel, radius, isCue, id, inPocket }
let cueBall = null;
let cueStickPivot, cueStickMesh, aimLine;

// Tisch-Parameter
const PLAY_L = 2.44; // Spielfeldlänge (Z)
const PLAY_W = 1.22; // Spielfeldbreite (X)
const TABLE_H = 0.85; // Höhe des Tisches
const BALL_R = 0.036; // Kugelradius (3.6 cm)
const POCKET_R = 0.075; // Radius der Taschen / Löcher
// Gummi-Halbbdite wie in table-blueprint.js (BoxGeometry-Breite 0.024)
const CUSHION_RUBBER_HALF_T = 0.012;

// Zustand
let cameraMode = "fps"; // 'fps' oder 'overhead'
let aimAngle = Math.PI * 0.5; // Zielen um weiße Kugel
let aimPitch = 0.12;
let selectedPower = 0.4; // 0.10 bis 1.0 (Standard: sanfte 40%)
let isCueMoving = false;
/** Kamera bleibt beim Stoß / während alle Kugeln rollen stehen, folgt erst wieder der Queue-Ansicht wenn alles stillsteht */
let rollingShotCameraLock = false;
let cueStrikeAnim = 0; // Für visuelle Vorstoß-Animation

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
/**
 * Lädt ein HDR-Fotostudio (equirectangular) und setzt scene.environment für IBL/Reflexionen.
 * @returns {Promise<void>}
 */
function setupStudioEnvironmentMap() {
  return new Promise((resolve) => {
    if (
      typeof THREE === "undefined" ||
      typeof THREE.RGBELoader !== "function" ||
      typeof THREE.PMREMGenerator !== "function"
    ) {
      resolve();
      return;
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const loader = new THREE.RGBELoader();
    loader.setDataType(THREE.HalfFloatType);
    loader.load(
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr",
      (texture) => {
        try {
          studioEnvMap = pmrem.fromEquirectangular(texture).texture;
          scene.environment = studioEnvMap;
          texture.dispose();
        } catch (e) {
          /* ignore */
        }
        pmrem.dispose();
        resolve();
      },
      undefined,
      () => {
        pmrem.dispose();
        resolve();
      }
    );
  });
}

async function init() {
  const container = document.getElementById("canvas-container");

  // 2.1 Szene & Nebel (Salon-Atmosphäre ohne störenden Staub/Schnee)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070a);
  // Kein Exponential-Nebel: der verdunkelt mit der Distanz stark und wirkt wie ein enger Lichtkegel

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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  if (renderer.outputEncoding !== undefined)
    renderer.outputEncoding = THREE.sRGBEncoding;
  if ("physicallyCorrectLights" in renderer)
    renderer.physicallyCorrectLights = true;
  container.appendChild(renderer.domElement);

  // 2.4 Licht & Salon
  setupLightingAndRoom();

  // HDR-Fotostudio über PMREM → scene.environment (schöne Spiegelungen auf PBR-Kugeln)
  await setupStudioEnvironmentMap();

  // 2.5 Tisch & Taschen mit echten Löchern (Bauplan: table-blueprint.js)
  const tableDims = {
    playL: PLAY_L,
    playW: PLAY_W,
    tableH: TABLE_H,
    pocketR: POCKET_R,
  };
  window.BilliardTableBlueprint.buildAuthenticTableWithHoles(
    scene,
    tableDims,
    pockets,
    cushions
  );

  // 2.6 Kugeln initialisieren
  setupBalls();

  // 2.7 Queue & Ziellinie
  setupCueAndAimLine();

  // 2.8 Events & UI
  setupControls();

  // Animation Loop starten
  requestAnimationFrame(gameLoop);
}

function setupLightingAndRoom() {
  // Weiches „Saallicht“ von der oberen Halbkugel – gleichmäßig, kein Spot
  const hemi = new THREE.HemisphereLight(0xfff2e0, 0x0a0c12, 0.72);
  hemi.position.set(0, 1, 0);
  scene.add(hemi);

  // Eine gedämpfte parallele Komponente von oben (wie große Deckenfläche), nur für Kontakt-Schatten
  const tableCenterY = TABLE_H;
  const ceilingLight = new THREE.DirectionalLight(0xffead4, 0.42);
  ceilingLight.position.set(0, 9, 0);
  ceilingLight.target.position.set(0, tableCenterY, 0);
  ceilingLight.castShadow = true;
  ceilingLight.shadow.mapSize.width = 2048;
  ceilingLight.shadow.mapSize.height = 2048;
  ceilingLight.shadow.bias = -0.00035;
  const halfW = PLAY_W * 0.95;
  const halfL = PLAY_L * 0.95;
  ceilingLight.shadow.camera.near = 0.5;
  ceilingLight.shadow.camera.far = 18;
  ceilingLight.shadow.camera.left = -halfW;
  ceilingLight.shadow.camera.right = halfW;
  ceilingLight.shadow.camera.top = halfL;
  ceilingLight.shadow.camera.bottom = -halfL;
  scene.add(ceilingLight);
  scene.add(ceilingLight.target);

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
   3. TASCHEN & BANDEN (Physik-Daten aus table-blueprint.js)
==================================================== */
/** @type {Array<{ x: number; z: number; radius: number; isSide: boolean }>} */
const pockets = [];
/** @type {Array<{ x1: number; z1: number; x2: number; z2: number; nx: number; nz: number }>} */
const cushions = [];

/* ====================================================
   4. HOCHGLÄNZENDE KUGELN MIT REFLEXIONEN
==================================================== */
function setupBalls() {
  rollingShotCameraLock = false;

  balls.forEach((b) => scene.remove(b.mesh));
  balls = [];

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
      roughness: 0.035,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.035,
      reflectivity: 1,
      envMapIntensity: studioEnvMap ? 1.35 : 1,
    });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x, TABLE_H + BALL_R, z);
    scene.add(mesh);

    const bObj = {
      mesh,
      pos: new THREE.Vector3(x, TABLE_H + BALL_R, z),
      vel: new THREE.Vector3(0, 0, 0),
      radius: BALL_R,
      isCue,
      id,
      falling: false,
      inPocket: false,
    };
    balls.push(bObj);
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

/* ====================================================
   5. FIRST-PERSON QUEUE & ZIELLINIE
==================================================== */
function setupCueAndAimLine() {
  cueStickPivot = new THREE.Group();
  // Stock bleibt relativ zur Kamera (folgt nicht der Kugel); mit Kamera eingefroren beim Rollen
  cueStickPivot.position.set(0.26, -0.2, -0.52);
  camera.add(cueStickPivot);

  // Billardqueue aus Holz mit Verjüngung
  const stickGeo = new THREE.CylinderGeometry(0.0065, 0.015, 1.45, 24);
  stickGeo.translate(0, 0.725, 0);
  stickGeo.rotateX(Math.PI / 2);
  const cueMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    roughness: 0.4,
    metalness: 0.05,
    envMapIntensity: studioEnvMap ? 0.45 : 1,
  });
  cueStickMesh = new THREE.Mesh(stickGeo, cueMat);
  cueStickMesh.castShadow = true;
  cueStickPivot.add(cueStickMesh);

  // Blaue Kreidespitze
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0067, 0.0067, 0.025, 16),
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.6,
      envMapIntensity: studioEnvMap ? 0.55 : 1,
    })
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
   6. FEHLERFREIE & AUSBALANCIERTE STOSS-MECHANIK
==================================================== */
function fireCueStrike() {
  if (!cueBall || cueBall.inPocket) return;

  // Akustischer Klick
  playClackSound(selectedPower * 0.8, 900);

  // Sanft ausbalancierte Stoßkraft (Realistisches Rollverhalten statt Übergeschwindigkeit)
  const impulseStrength = 0.8 + selectedPower * 3.4;
  const dirX = -Math.sin(aimAngle);
  const dirZ = -Math.cos(aimAngle);

  cueBall.vel.x = dirX * impulseStrength;
  cueBall.vel.z = dirZ * impulseStrength;

  // Visuelle Schnapp-Animation des Queues
  cueStrikeAnim = 1.0;

  // Kamera hält diese Position, bis alle Kugeln zur Ruhe kommen
  rollingShotCameraLock = true;

  // Status UI aktualisieren
  updateStatusDisplay(true);
}

function updateStatusDisplay(moving) {
  isCueMoving = moving;
  const dot = document.getElementById("status-dot");
  const txt = document.getElementById("status-text");
  if (moving) {
    dot.className =
      "w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] animate-pulse";
    txt.innerText = "Kugeln rollen...";
    txt.className = "text-xs text-amber-300 font-medium tracking-wide";
  } else {
    dot.className =
      "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]";
    txt.innerText = "Bereit zum Stoß";
    txt.className = "text-xs text-neutral-400 font-medium tracking-wide";
  }
}

/* ====================================================
   7. INTERAKTIONEN, MAUSRAD-STEUERUNG & EVENTS
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
    if (e.code === "Space" && !e.repeat) {
      fireCueStrike();
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

  container.addEventListener("touchend", () => {
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

/**
 * Kollision mit Banden-Segmenten (gleiche Geometrie wie buildAuthenticTableWithHoles).
 * `cushions`-Einträge: Kante am Filzrand, `nx`/`nz` zeigen ins Spielfeld; Gummi-Innenfläche
 * liegt um CUSHION_RUBBER_HALF_T nach innen (siehe table-blueprint.js).
 *
 * @param {{ pos: { x: number; z: number }; vel: { x: number; z: number }; radius: number }} b
 */
function resolveCushionCollision(b) {
  const depth = CUSHION_RUBBER_HALF_T;
  const r = b.radius;
  const pad = Math.max(r * 0.001, 1e-6);

  for (let c = 0; c < cushions.length; c++) {
    const seg = cushions[c];
    const nx = seg.nx;
    const nz = seg.nz;
    const ax = seg.x1;
    const az = seg.z1;
    const lx = seg.x2 - ax;
    const lz = seg.z2 - az;
    const lenSq = lx * lx + lz * lz;
    if (lenSq < 1e-12) continue;

    const ox = b.pos.x - ax;
    const oz = b.pos.z - az;
    let t = (ox * lx + oz * lz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const qx = ax + t * lx;
    const qz = az + t * lz;

    const radial = (b.pos.x - qx) * nx + (b.pos.z - qz) * nz;
    if (radial >= depth + r) continue;

    const push = depth + r + pad - radial;
    b.pos.x += nx * push;
    b.pos.z += nz * push;

    const vDotN = b.vel.x * nx + b.vel.z * nz;
    if (vDotN >= 0) continue;

    b.vel.x -= 2 * vDotN * nx;
    b.vel.z -= 2 * vDotN * nz;
    b.vel.x *= 0.82;
    b.vel.z *= 0.82;
    playClackSound(Math.min(Math.abs(vDotN) * 0.4, 0.5), 550);
  }
}

/* ====================================================
   8. EXAKTE PHYSIK-SIMULATION (Kugeln, Banden, Taschen)
==================================================== */
function updatePhysics(dt) {
  const friction = 0.985; // Realistische Ausrollreibung auf Billardtuch
  let totalMotion = 0;

  // 8.1 Bewegung & Bandenreflexion
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    if (b.inPocket) continue;

    // Position aktualisieren
    b.pos.x += b.vel.x * dt;
    b.pos.z += b.vel.z * dt;

    // Reibung anwenden
    b.vel.x *= Math.pow(friction, dt * 60);
    b.vel.z *= Math.pow(friction, dt * 60);

    const speedSq = b.vel.x * b.vel.x + b.vel.z * b.vel.z;
    if (speedSq < 0.0003) {
      b.vel.x = 0;
      b.vel.z = 0;
    } else {
      totalMotion += speedSq;
    }

    resolveCushionCollision(b);

    // Taschen-Erkennung (Löcher)
    for (let p = 0; p < pockets.length; p++) {
      const pock = pockets[p];
      const distSq = (b.pos.x - pock.x) ** 2 + (b.pos.z - pock.z) ** 2;
      if (distSq < pock.radius * pock.radius) {
        b.inPocket = true;
        b.vel.set(0, 0, 0);
        b.mesh.position.y = -10; // Kugel fällt in die Tasche

        // Falls weiße Spielkugel versenkt wurde -> Neu aufstellen
        if (b.isCue) {
          setTimeout(() => {
            b.inPocket = false;
            b.pos.set(0, TABLE_H + BALL_R, PLAY_L * 0.28);
            b.vel.set(0, 0, 0);
          }, 600);
        }
        break;
      }
    }
  }

  // 8.2 Elastische Kugel-zu-Kugel-Kollisionen
  const diam = BALL_R * 2;
  const diamSq = diam * diam;

  for (let i = 0; i < balls.length; i++) {
    const b1 = balls[i];
    if (b1.inPocket) continue;

    for (let j = i + 1; j < balls.length; j++) {
      const b2 = balls[j];
      if (b2.inPocket) continue;

      const dx = b2.pos.x - b1.pos.x;
      const dz = b2.pos.z - b1.pos.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < diamSq && distSq > 0.000001) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const nz = dz / dist;

        // Überlappung korrigieren
        const overlap = (diam - dist) * 0.5;
        b1.pos.x -= nx * overlap;
        b1.pos.z -= nz * overlap;
        b2.pos.x += nx * overlap;
        b2.pos.z += nz * overlap;

        // Impulsübertragung entlang Normalen
        const kx = b1.vel.x - b2.vel.x;
        const kz = b1.vel.z - b2.vel.z;
        const p = 2 * (nx * kx + nz * kz) / 2;

        b1.vel.x -= p * nx * 0.94;
        b1.vel.z -= p * nz * 0.94;
        b2.vel.x += p * nx * 0.94;
        b2.vel.z += p * nz * 0.94;

        const impactSpeed = Math.abs(p);
        if (impactSpeed > 0.08) {
          playClackSound(impactSpeed * 0.4, 750 + Math.random() * 200);
        }
      }
    }
  }

  // Meshes auf Physik-Positionen setzen + Kugelrotation
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    if (!b.inPocket) {
      b.mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
      const speed = Math.sqrt(b.vel.x * b.vel.x + b.vel.z * b.vel.z);
      if (speed > 0.001) {
        const rotAxis = new THREE.Vector3(b.vel.z, 0, -b.vel.x).normalize();
        b.mesh.rotateOnWorldAxis(rotAxis, (speed * dt) / BALL_R);
      }
    }
  }

  // Statusindikator anpassen
  const moving = totalMotion > 0.01;
  if (moving !== isCueMoving) {
    updateStatusDisplay(moving);
  }
}

/* ====================================================
   9. GAME LOOP
==================================================== */
let lastTime = performance.now();

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop);

  const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
  lastTime = currentTime;

  // Physikschritt
  updatePhysics(dt);
  if (!isCueMoving) {
    rollingShotCameraLock = false;
  }

  // Queue: nur Abstand/Neigung (lokal zur Kamera), keine Positionsbindung an die Kugel
  if (cueBall && cueStickPivot) {
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

  // Kamera-Positionierung (während rollender Kugeln einfrieren)
  const cameraRollingLocked = rollingShotCameraLock || isCueMoving;
  if (!cameraRollingLocked) {
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
  }

  renderer.render(scene, camera);
}

window.addEventListener("DOMContentLoaded", init);
