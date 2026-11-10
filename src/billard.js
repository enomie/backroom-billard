"use strict";

import {
  PLAY_L,
  HEAD_SPOT_Z,
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
import { captureRoomReflection, applyBallReflection } from "./ball-reflection.js";
import { createRoom } from "./room.js";
import { createFurniture } from "./furniture.js";
import { createCandles } from "./candle.js";
import { createAshtrays } from "./ashtray.js";
import { createGlasses } from "./glasses.js";
import { createBottles } from "./bottles.js";
import { createCigarettes } from "./cigarettes.js";
import { createCigarettePacks } from "./cigarette-pack.js";
import { createLighters } from "./lighter.js";
import { createAtmosphere } from "./atmosphere.js";
import { createExhale } from "./exhale.js";
import { createSmoking, sideOf, setMySide } from "./smoking.js";
import { createDrinking } from "./drinking.js";
import { createSettings } from "./settings.js";
import { ballTexture } from "./ball-texture.js";
import { displayName } from "./name-rules.js";
import { loadProfile } from "./profile-store.js";
import { isStartScreenOpen } from "./start-screen.js";
import { createDoor } from "./door.js";
import { createNeonSign } from "./neon-sign.js";
import { createPiano } from "./piano.js";
import { createPlayerState } from "./player-state.js";
import { SWAY_PITCH_OFFSET } from "./player-constants.js";
import { createWallet } from "./wallet.js";
import { createStakeWindow } from "./stake-window.js";
import { createDrinkMenu } from "./drink-menu.js";
import { createWallLamps } from "./wall-lamps.js";
import { createRadio } from "./radio.js";
import { createBar } from "./bar.js";
import { createBarLamps } from "./bar-lamps.js";
import { createBackbar } from "./backbar.js";
import { createFaceBall } from "./face-ball.js";
import { createMultiplayer } from "./multiplayer.js";
import { roomNote, renderNote } from "./room-notices.js";
import { isCountry, flagUrl } from "./country-list.js";
import { createShotRecorder, createShotReplay } from "./shot-replay.js";
import { AIM_SEND_SECONDS } from "./multiplayer-constants.js";
import { DRINK_SIPS } from "./glasses-constants.js";
import { PACK_SIZE } from "./cigarette-pack.js";
import { createCueModel, CUE_LENGTH } from "./cue-model.js";
import { playDrawBackSound, playForwardSound, playStrikeSound } from "./shot-sounds.js";
import { playBallHitSound, playCushionHitSound } from "./collision-sounds.js";
import { playPocketEntrySound, playCupLandingSound, playCupWallSound } from "./cup-sounds.js";
import { updateAudioListener } from "./audio.js";
import { updateRollingSound } from "./rolling-sound.js";
import { BALL_TOUCH_DISTANCE } from "./sound-constants.js";
import {
  CUE_FOLLOW_THROUGH_TIME,
  CUE_RELAX_TIME,
  CUE_RETURN_TIME,
  CUE_CARRY_TIP,
  CUE_CARRY_DIRECTION,
  CUE_SWAY_AMPLITUDE,
  CUE_SWAY_SPEED,
  CUE_AIM_GAP,
  CUE_STRIKE_OFFSET_MAX,
  CUE_BACK_GAP_MIN,
  CUE_BACK_GAP_MAX,
  CUE_BACK_TIME_MIN,
  CUE_BACK_TIME_MAX,
  CUE_HOLD_TIME_MIN,
  CUE_HOLD_TIME_MAX,
  CUE_FOLLOW_DISTANCE,
  CUE_STRIKE_RESTITUTION,
  CUE_STROKE_SUBSTEPS,
  CUE_PITCH_BELOW_CAMERA,
  CUE_PITCH_MIN,
  CUE_PITCH_MAX,
} from "./cue-constants.js";
import {
  FREE_CAM_SPEED,
  FREE_CAM_LOOK_SENSITIVITY,
  FREE_CAM_TOUCH_TURN,
  FREE_CAM_TOUCH_MOVE,
  FREE_CAM_MIN_Y,
  FREE_CAM_MAX_Y,
  FREE_CAM_START_POSITION,
  FREE_CAM_START_TARGET,
  FREE_CAM_ROOM_MARGIN,
  CAMERA_FLIGHT_SECONDS,
  FREE_CAM_BACK,
  FREE_CAM_SIDE,
  FREE_CAM_UP,
  FREE_CAM_PITCH,
  FREE_CAM_HEAD_DISTANCE,
  FP_CAM_DISTANCE,
  FP_CAM_MIN_ELEVATION,
  FP_CAM_MAX_ELEVATION,
  FP_CAM_DEFAULT_ELEVATION,
  FP_CAM_LOOK_AHEAD,
  FP_CAM_KEY_TURN_SPEED,
  FP_CAM_FOCUS_RATE,
  SHOT_REST_DELAY,
  ROOM_LENGTH,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  ROOM_AMBIENT_COLOR,
  ROOM_AMBIENT_INTENSITY,
  LAMP_SHADOW_SWAY_INTERVAL,
  LAMP_SHADOW_BURN_STEP,
} from "./room-constants.js";
import { PIANO_SEAT_SECONDS } from "./piano-constants.js";
import { t, onLanguageChange } from "./i18n/index.js";
import {
  PHYSICS_STEP,
  REST_LINEAR_SPEED,
  REST_SURFACE_SPEED,
  CUSHION_RESTITUTION,
  CUE_SQUIRT_MAX_DEG,
  SWERVE_BOOST,
  SWERVE_SECONDS,
  TABLE_FRICTION,
  BALL_FRICTION,
  CUE_RESPAWN_DELAY,
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
// Where the cue tip meets the ball, set with the nub on the shoot button: -1..1 across / up (unit circle)
const strikeNub = { x: 0, y: 0 };
let aimSwayPitch = 0; // the vertical part of the swing: with aimSway the cue tip circles around the target
let aimSway = 0; // the swing of the cue and aim line from the player's condition (rad, player-state.js)
let aimElevation = FP_CAM_DEFAULT_ELEVATION; // camera elevation above the table (rad)
let elevationGlide = false; // a new turn: the elevation eases back to the flat default until the player tilts the camera himself
const camFocus = new THREE.Vector3(); // orbit center of the cue camera (the shot position)
let selectedPower = 0.4; // 0.01 to 1.0 (default: gentle 40%)
const POWER_MIN = 1; // percent: the weakest shot (never 0)
const POWER_MAX = 100;
let isCueMoving = false;
/** True from the shot until the table has come to rest; the cue and the camera stay behind. */
let shotInProgress = false;
let shotRestTimer = 0;
let cueGap = CUE_AIM_GAP; // gap between the cue tip and the ball surface for this frame
/** Running cue stroke (draw back → hold → forward → follow → done), or null. */
let stroke = null;
let tipTouchedCueBall = false; // this stroke: the physical tip has touched the white ball (a coloured ball first is a foul)
let strokeContacted = false; // the tip has hit the ball; the follow-through timer may start
let cueShotTime = 0; // seconds since the shot
let cueRelax = 0; // 0 = aiming/strike pose, 1 = relaxed hold (linear; eased when applied)
let cueRespawnWait = null; // seconds since the white ball is gone (pocketed or off the table); null = it is on the table
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
let ballReflection = null; // captured room reflection used by the ball materials
let exhale = null; // exhaled smoke cloud (exhale.js)
let packs = null; // the cigarette packs (cigarette-pack.js)
let lighters = null; // the two lighters (lighter.js)
let wallet = null; // the player's money (wallet.js)
let stakeWindow = null; // the stake window and the table bet (stake-window.js)
let drinkMenu = null; // the drinks popover (drink-menu.js)
let settings = null; // the settings overlay (settings.js)
let drinking = null; // sips from the player glasses with the R key (drinking.js)
const playerState = createPlayerState(); // thirst / drunk and nerves / desire (player-state.js)
let smoking = null; // drawing on the player's cigarette with the T key (smoking.js)
let atmosphere = null; // drifting fog and light shafts (atmosphere.js)
let cigarettes = null; // single cigarettes in the ashtrays (cigarettes.js)
let bottles = null; // wine and beer bottles (bottles.js)
let glasses = null; // wine and beer glasses (glasses.js)
let ashtrays = null; // glass ashtrays (ashtray.js)
let candles = null; // candle holders on the tables (candle.js)
let piano = null; // grand piano, can be played with the mouse and the keys (piano.js)
/** "off", "entering" (the camera moves to the stool), "on" (seated, playing), "leaving" (back to where it was). */
let pianoMode = "off";
let pianoMine = false; // multiplayer: the database says that I sit at the piano
let pianoSitter = null; // multiplayer: the name of the guest who sits there (not me), or null
const pianoTransition = { from: new THREE.Vector3(), to: new THREE.Vector3(), fromQuat: new THREE.Quaternion(), toQuat: new THREE.Quaternion(), t: 0 };
/** The flight of the camera to the other view after C: from where it was, to the new view (fixed for the free camera, followed each frame for the cue camera). */
const cameraFlight = { active: false, t: 0, from: new THREE.Vector3(), fromQuat: new THREE.Quaternion(), to: new THREE.Vector3(), toQuat: new THREE.Quaternion() };
const pianoReturn = { position: new THREE.Vector3(), yaw: 0, pitch: 0 };
/** The multiplayer game (null fields in single player): is one running, and is it this guest's turn. */
const mpGame = { running: false, myTurn: false, turnSeat: 0 };
let mpWantCamera = null; // "fps" / "free": the camera follows the turn (to the cue view when it is my turn, else free) until it is there
/** The cue of the one who is up, as the others see it: moved by his aim, and during his shot by the replay. */
const remoteCue = { active: false, angle: 0, pitch: 0, x: 0, y: 0, gap: CUE_AIM_GAP, relax: 0, place: null }; // place: where it struck (null: at the ball)
const remoteView = new THREE.Object3D(); // the head of the one who is up (where his camera is): his cue is carried relative to it
const remoteAim = { angle: 0, pitch: 0, x: 0, y: 0 }; // where the aim is going (the cue follows smoothly)
const replay = createShotReplay(); // the shot of the other one, played back a little later
let watchedShot = false; // a spectator has seen a shot of this game (so the end of it is news to him)
let queuedEvents = []; // events (shot result, turn, end) that wait until the replay of the last shot is over
let recorder = null; // writes down my shot for the others
let aimAge = 0;
let mpShot = null; // my shot in a multiplayer game: what happens until the balls lie still, to be reported
let multiplayer = null; // the others: faces at their cameras (multiplayer.js)
let faceBall = null; // a face as a ball in the room: a click throws the dice (face-ball.js)
let radio = null; // radio on the sideboard (radio.js)
let physicsAcc = 0; // time accumulator for fixed physics steps
/** Physics steps still to run after something was put on the table (new rack, re-spotted ball); everything at rest needs no steps. */
let physicsAwake = 0;
const PHYSICS_AWAKE_STEPS = 120;
const noRolling = [];

/** HUD elements that change every frame, looked up once; they are written only when the value changes. */
const hud = {
  markerBody: { element: null, value: NaN },
  markerNicotine: { element: null, value: NaN },
  packCountElement: null,
  packCount: -1,
  sipCountElement: null,
  sipCount: -1,
};
function setMarker(marker, percent) {
  marker.element ??= document.getElementById(marker === hud.markerBody ? "marker-body" : "marker-nicotine");
  const rounded = Math.round(percent * 20) / 20; // 0.05 % steps are far below a pixel
  if (rounded === marker.value) return;
  marker.value = rounded;
  marker.element.style.left = rounded + "%";
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
  renderer.shadowMap.autoUpdate = false; // the shadow maps are redrawn only when a shadow caster moved (see updateShadows)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  // 2.4 Light & backroom
  setupLightingAndRoom();
  if (new URLSearchParams(location.search).has("perf")) import("./perf-hud.js").then((m) => (perfHud = m.createPerfHud(renderer, scene)));

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

  // 2.5c Room reflection for the balls (captured before balls and cue exist)
  ballReflection = captureRoomReflection(renderer, scene);
  candles.applyReflection(ballReflection);
  ashtrays.applyReflection(ballReflection);
  lighters.applyReflection(ballReflection);
  exhale = createExhale(scene);
  atmosphere = createAtmosphere(scene); // after the capture, so the balls do not reflect the haze
  glasses.applyReflection(ballReflection);
  wallet = createWallet((balance) => {
    myBalance = balance;
    renderMatch();
    tellStakeWindow();
    multiplayer?.setMoney(balance); // (the others see it under my name)
  });
  smoking = createSmoking(cigarettes, exhale, lighters, packs, wallet, (dt) => playerState.drag(dt));
  let orderFor = null; // the empty glass the menu is for
  drinkMenu = createDrinkMenu(wallet, (item) => {
    if (wallet.spend(item.price)) orderFor.replace(item.kind);
  });
  drinking = createDrinking(glasses, () => playerState.sip(), (glass) => {
    orderFor = glass;
    drinkMenu.show();
  });
  bottles.applyReflection(ballReflection);

  // 2.6 Initialize balls
  setupBalls();

  // 2.7 Cue & aim line
  setupCueAndAimLine();

  // 2.8 Events & UI
  setupControls();
  renderCameraLabel();
  snapFpsCamera();

  // What never moves keeps its matrices: they are not recomputed every frame
  scene.updateMatrixWorld(true);
  for (const child of scene.children) {
    if (STATIC_GROUPS.has(child.name)) child.traverse((object) => (object.matrixAutoUpdate = false));
  }

  // Start the animation loop
  requestAnimationFrame(gameLoop);
}

/** Groups of the scene whose objects stand still for the whole game. */
const STATIC_GROUPS = new Set(["room", "furniture", "bottles", "ashtrays", "wall-lamps", "ceiling-lamps", "atmosphere", "cigarette-packs"]);

/**
 * Cue camera: orbits `camFocus` directly from the aim angle and elevation (no smoothing, so the
 * camera, the aim line and the cue always agree and nothing jitters).
 */
function placeAimCamera() {
  const ce = Math.cos(aimElevation);
  camera.position.set(
    camFocus.x + Math.sin(aimAngle) * ce * FP_CAM_DISTANCE,
    camFocus.y + Math.sin(aimElevation) * FP_CAM_DISTANCE,
    camFocus.z + Math.cos(aimAngle) * ce * FP_CAM_DISTANCE
  );
  const ahead = FP_CAM_LOOK_AHEAD * ce;
  camera.lookAt(camFocus.x - Math.sin(aimAngle) * ahead, camFocus.y, camFocus.z - Math.cos(aimAngle) * ahead);
}

/** Jump the cue camera to the cue ball (start, new rack). */
function snapFpsCamera() {
  if (cameraMode !== "fps" || !cueBall) return;
  camFocus.copy(cueBall.pos);
  placeAimCamera();
}

function setupLightingAndRoom() {
  // Weak, dimmed ambient light
  const ambLight = new THREE.AmbientLight(ROOM_AMBIENT_COLOR, ROOM_AMBIENT_INTENSITY);
  scene.add(ambLight);

  // Three identical ceiling lamps above the table (parameters: room-constants.js)
  createCeilingLamps(scene, TABLE_H);

  // Room: carpet floor, cream walls, wooden ceiling + smoke fog, and subtle wall lamps
  createRoom(scene);
  createWallLamps(scene);
  createDoor(scene); // the (dummy) door in the wall behind the player at the start
  createNeonSign(scene); // the neon sign on the wall opposite
  piano = createPiano(scene, (midis) => pianoMine && multiplayer.playKeys(midis)); // the grand piano beside it (the keys I hold go to the others)
  createFurniture(scene);
  candles = createCandles(scene);
  ashtrays = createAshtrays(scene);
  glasses = createGlasses(scene, [...candles.taken, ...ashtrays.taken]);
  bottles = createBottles(scene, glasses.taken);
  cigarettes = createCigarettes(scene, ashtrays.slots);
  packs = createCigarettePacks(scene, bottles.taken);
  lighters = createLighters(scene);
  radio = createRadio(scene);
  createBar(scene, glasses, bottles);
  createBarLamps(scene);
  createBackbar(scene, bottles);
  faceBall = createFaceBall(scene);
  multiplayer = createMultiplayer(
    scene,
    applyRoom,
    (kind, name) => roomNote(kind === "joined" ? "room.joined" : "room.left", name),
    onMultiplayerGame
  );
  recorder = createShotRecorder((index, bytes) => multiplayer.pushChunk(index, bytes, mpShot?.seq));
  stakeWindow = createStakeWindow({
    onStake: (amount) => multiplayer.setStake(amount),
    onReady: (ready) => multiplayer.setReady(ready),
    onBid: (amount) => multiplayer.placeBid(amount),
    onWithdraw: () => multiplayer.withdrawBid(),
  });
}

/* ====================================================
   3. GLOSSY BALLS WITH REFLECTIONS
==================================================== */
function setupBalls() {
  physicsAwake = PHYSICS_AWAKE_STEPS; // the new balls settle on the cloth
  cueRespawnWait = null;
  balls.forEach((b) => {
    scene.remove(b.mesh);
    if (physics && b.body) physics.removeBall(b.body);
  });
  balls = [];
  ballByCollider.clear();
  stroke = null;
  if (physics) physics.cue.collider.setEnabled(false);
  pendingRemoval.length = 0;
  clearPocketedHud();
  hideGameOver();
  shotInProgress = false;
  elevationGlide = true; // a new rack starts like every turn: flat
  cueRelax = 0;

  const sphereGeo = new THREE.SphereGeometry(BALL_R, 32, 32);

  function createBall(x, z, colorHex, isCue = false, id = 0) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, // the color comes from the texture, with its specks
      map: ballTexture(colorHex, id),
      roughness: 0.03,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 0.98,
    });
    applyBallReflection(mat, ballReflection);
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
      preVel: new THREE.Vector3(0, 0, 0), // velocity before the last physics step
      radius: BALL_R,
      isCue,
      id,
      color: colorHex,
      inPocket: false, // true only once the ball has hit the cup floor
      inHole: false, // currently dropping into a pocket (the entry sound played)
    };
    balls.push(bObj);
    ballByCollider.set(collider.handle, bObj);
    return bObj;
  }

  // Cue ball
  cueBall = createBall(0, HEAD_SPOT_Z, 0xf8fafc, true, 0);

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
  const baseZ = HEAD_SPOT_Z;
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
  if (remoteCue.active) {
    cueRelax = Math.max(0, cueRelax - dt / CUE_RETURN_TIME); // the cue of the one who is up is shown at the ball, not carried
  } else if (cameraMode === "free") {
    cueRelax = Math.min(1, cueRelax + dt / CUE_RELAX_TIME);
  } else if (shotInProgress) {
    if (strokeContacted) cueShotTime += dt; // the follow-through starts at the contact
    if (strokeContacted && cueShotTime > CUE_FOLLOW_THROUGH_TIME) {
      cueRelax = Math.min(1, cueRelax + dt / CUE_RELAX_TIME);
      if (mpShot && !mpShot.freed) {
        // multiplayer: after the stroke the shooter's head and cue go to the free camera (the others see his head there, he watches the balls)
        mpShot.freed = true;
        mpWantCamera = "free";
      }
    }
  } else {
    cueRelax = Math.max(0, cueRelax - dt / CUE_RETURN_TIME);
  }
}

/**
 * Place the cue (call after the camera has been updated for this frame).
 * Aiming/strike pose: tip `gap` in front of the ball surface, butt rising behind it.
 * Relaxed hold: the cue is carried in the lower right of the camera view, tip pointing diagonally
 * into the scene; the two poses are blended smoothly (position lerp, rotation slerp).
 */
function poseCue(gap, relax = cueRelax, view = camera) {
  const eased = relax * relax * (3 - 2 * relax);

  // Aiming/strike pose in the pivot's local space (cue origin = tip, +z towards the player).
  // The cue axis passes through the ball center: the tip sits `gap` away from the ball surface.
  const source = stroke ?? (remoteCue.active ? remoteCue : null); // my own stroke, or the cue of the one who is up
  const pitch = source ? source.pitch : aimCuePitch();
  _cueEuler.set(-pitch, 0, 0);
  _cueQuatAim.setFromEuler(_cueEuler);
  const reach = BALL_R + gap;
  const off = source ?? strikeNub;
  const side = off.x * CUE_STRIKE_OFFSET_MAX * BALL_R;
  const up = off.y * CUE_STRIKE_OFFSET_MAX * BALL_R; // along the cue's "up", perpendicular to its axis
  cueStickMesh.position.set(
    side,
    Math.sin(pitch) * reach + Math.cos(pitch) * up,
    Math.cos(pitch) * reach - Math.sin(pitch) * up
  );
  cueStickMesh.quaternion.copy(_cueQuatAim);
  if (eased <= 0) return;

  // Carried pose: defined in camera space, converted into the pivot's local space
  const sway = Math.sin((performance.now() / 1000) * CUE_SWAY_SPEED) * CUE_SWAY_AMPLITUDE;
  view.updateMatrixWorld(true);
  cueStickPivot.updateMatrixWorld(true);
  _cueCarryPos.set(...CUE_CARRY_TIP).applyMatrix4(view.matrixWorld);
  _cueCarryDir.set(CUE_CARRY_DIRECTION[0] + sway, CUE_CARRY_DIRECTION[1] + sway * 0.5, CUE_CARRY_DIRECTION[2]).normalize();
  _cueCarryDir.transformDirection(view.matrixWorld);
  _cueQuatCarry.setFromUnitVectors(_cueForward, _cueCarryDir);
  cueStickPivot.worldToLocal(_cueCarryPos);
  _pivotInverse.copy(cueStickPivot.quaternion).invert(); // pivot: rotates around y only, no parent
  _cueQuatCarry.premultiply(_pivotInverse);

  cueStickMesh.position.lerp(_cueCarryPos, eased);
  cueStickMesh.quaternion.slerp(_cueQuatCarry, eased);
}

function fireCueStrike() {
  if (gameState !== "playing" || cameraMode !== "fps") return; // the free camera only observes
  if (mpGame.running && !mpGame.myTurn) return; // the other one is up
  if (stakeWindow.open) return; // the stake is being set
  if (shotInProgress) return; // wait until the table is still
  if (!cueBall || cueBall.inPocket || cueBall.pos.y < TABLE_H - 0.01) return;

  // Ignore double-triggered events (button+key, touch+mouse)
  const now = performance.now();
  if (now - lastShotTime < 300) return;
  lastShotTime = now;

  if (mpGame.running) {
    // what happens in the shot is noted (and the sounds written down) and reported when the balls lie still
    mpShot = { pocketed: [], foul: false, whiteGone: false };
    recorder.start(performance.now());
  }
  startCueStroke();
  if (mpGame.running) {
    mpShot.seq = multiplayer.takeShot({ aimAngle: stroke.aimAngle, power: selectedPower, nubX: strikeNub.x, nubY: strikeNub.y, elevation: stroke.pitch, error: 0 });
  }

  // The orbit center stays at the shot position until everything has come to rest (the player can still turn the camera)
  shotInProgress = true;
  shotRestTimer = 0;
  strokeContacted = false;
  tipTouchedCueBall = false;
}

/* Cue stroke: the cue is drawn back, pauses, snaps forward and HITS the ball physically
   (kinematic cue tip body in Rapier, see physics-world.js); power decides how far, how long, how fast. */
const smooth = (x) => x * x * (3 - 2 * x);
const _strokeQuat = new THREE.Quaternion();
const _strokeEuler = new THREE.Euler(0, 0, 0, "YXZ");

function startCueStroke() {
  const power = selectedPower;
  const f = (power * 100 - POWER_MIN) / (POWER_MAX - POWER_MIN); // 0 = weakest, 1 = strongest
  const ballSpeed = 0.8 + power * 3.4; // gently balanced shot strength (m/s)
  const pitch = aimCuePitch();
  // the horizontal part of the cue speed must give the ball the intended speed
  const vCue = ballSpeed / ((1 + CUE_STRIKE_RESTITUTION) * Math.cos(pitch));
  const backGap = THREE.MathUtils.lerp(CUE_BACK_GAP_MIN, CUE_BACK_GAP_MAX, f);
  const t = cueBall.body.translation();
  stroke = {
    phase: "back",
    t: 0,
    aimAngle: aimAngle + aimSway + playerState.shotError(), // what the player aims at plus a drunk shot's error
    pitch,
    x: strikeNub.x,
    y: strikeNub.y,
    ballPos: { x: t.x, y: t.y, z: t.z },
    backGap,
    tBack: THREE.MathUtils.lerp(CUE_BACK_TIME_MIN, CUE_BACK_TIME_MAX, f),
    tHold: THREE.MathUtils.lerp(CUE_HOLD_TIME_MIN, CUE_HOLD_TIME_MAX, f),
    vCue,
    ballSpeed,
    tForward: (2 * backGap) / vCue, // quadratic ease-in: the end speed is exactly vCue
    gap: CUE_AIM_GAP,
    strength: f,
  };
  cueStickPivot.rotation.y = stroke.aimAngle; // the cue points where the shot goes
  shotSound(SOUND_DRAW_BACK, f, stroke.tBack, [stroke.aimAngle, 0, 0]); // hand sliding on the shaft + inhale
}

/** Cue elevation for the current camera elevation: slightly below the line of sight. */
function aimCuePitch() {
  return THREE.MathUtils.clamp(aimElevation - CUE_PITCH_BELOW_CAMERA + aimSwayPitch, CUE_PITCH_MIN, CUE_PITCH_MAX);
}

/** Where the shot sounds come from: the cue behind the ball and the player's head further back. */
/** The sounds of a shot: made here, and written down for the others when it is my shot in a multiplayer game. */
const SOUND_DRAW_BACK = 1;
const SOUND_FORWARD = 2;
const SOUND_STRIKE = 3;
const SOUND_POCKET_ENTRY = 4;
const SOUND_CUP_LANDING = 5;
const SOUND_CUP_WALL = 6;
const SOUND_CUSHION_HIT = 7;
const SOUND_BALL_HIT = 8;

/**
 * Play a sound of the shot and, in my shot in a multiplayer game, note it for the others.
 * @param {number} kind — SOUND_*
 * @param {number} p1 — the strength or speed
 * @param {number} p2 — the seconds (cue sounds), the ball (the numbers of both for a clack: a × 100 + b)
 * @param {number[]} position — where it is heard (for the cue sounds: the angle of the shot in the first place)
 */
function shotSound(kind, p1, p2, position) {
  playShotSound(kind, p1, p2, position);
  if (mpShot) recorder.event(performance.now(), kind, p1, p2, position);
}

/** The sound itself (also for the replay of the shot of another guest). */
function playShotSound(kind, p1, p2, position) {
  switch (kind) {
    case SOUND_DRAW_BACK:
      playDrawBackSound(p1, p2, shotSoundPositions(position[0]));
      break;
    case SOUND_FORWARD:
      playForwardSound(p1, p2, shotSoundPositions(position[0]));
      break;
    case SOUND_STRIKE:
      playStrikeSound(p1, position);
      break;
    case SOUND_POCKET_ENTRY:
      playPocketEntrySound(p1, `r${p2}`, position);
      break;
    case SOUND_CUP_LANDING:
      playCupLandingSound(p1, `f${p2}`, position);
      break;
    case SOUND_CUP_WALL:
      playCupWallSound(p1, `w${p2}`, position);
      break;
    case SOUND_CUSHION_HIT:
      playCushionHitSound(p1, `c${p2}`, position);
      break;
    case SOUND_BALL_HIT:
      playBallHitSound(p1, `b${Math.floor(p2 / 100)}-${p2 % 100}`, position);
      break;
  }
}

function shotSoundPositions(angle) {
  const back = [Math.sin(angle), 0, Math.cos(angle)];
  const at = (distance, up) => [
    cueBall.pos.x + back[0] * distance,
    cueBall.pos.y + up,
    cueBall.pos.z + back[2] * distance,
  ];
  return { cue: at(0.5, 0.06), head: at(1.1, 0.5) };
}

/** Advance the stroke by one physics step and move the kinematic cue tip body accordingly. */
function advanceCueStroke(dt) {
  if (!stroke || stroke.phase === "done") return;
  const s = stroke;
  s.t += dt;

  if (s.phase === "back") {
    const k = Math.min(1, s.t / s.tBack);
    s.gap = THREE.MathUtils.lerp(CUE_AIM_GAP, s.backGap, smooth(k));
    if (k >= 1) [s.phase, s.t] = ["hold", 0];
  } else if (s.phase === "hold") {
    s.gap = s.backGap;
    if (s.t >= s.tHold) {
      [s.phase, s.t] = ["forward", 0];
      physics.cue.collider.setEnabled(true);
      shotSound(SOUND_FORWARD, s.strength, s.tForward, [s.aimAngle, 0, 0]); // air swish peaking at the contact + exhale
    }
  } else if (s.phase === "forward") {
    const k = Math.min(1, s.t / s.tForward);
    s.gap = s.backGap * (1 - k * k);
    if (k >= 1) {
      [s.phase, s.t] = ["follow", 0];
      onCueContact();
    }
  } else if (s.phase === "follow") {
    s.gap = -s.vCue * s.t;
    if (s.gap <= -CUE_FOLLOW_DISTANCE) {
      s.gap = -CUE_FOLLOW_DISTANCE;
      s.phase = "done";
      physics.cue.collider.setEnabled(false);
      limitSquirt(s);
      ensureBallWasHit(s);
    }
  }

  // Tip pose: on the axis through the ball center, `gap` away from the ball surface
  const cp = Math.cos(s.pitch);
  const fx = -Math.sin(s.aimAngle) * cp;
  const fy = -Math.sin(s.pitch);
  const fz = -Math.cos(s.aimAngle) * cp;
  const d = BALL_R + s.gap;
  const side = s.x * CUE_STRIKE_OFFSET_MAX * BALL_R;
  const up = s.y * CUE_STRIKE_OFFSET_MAX * BALL_R;
  const sa = Math.sin(s.aimAngle);
  const ca = Math.cos(s.aimAngle);
  const sp = Math.sin(s.pitch);
  physics.cue.body.setNextKinematicTranslation({
    x: s.ballPos.x - fx * d + side * ca - up * sp * sa,
    y: s.ballPos.y - fy * d + up * cp,
    z: s.ballPos.z - fz * d - side * sa - up * sp * ca,
  });
  _strokeEuler.set(-s.pitch, s.aimAngle, 0);
  _strokeQuat.setFromEuler(_strokeEuler);
  physics.cue.body.setNextKinematicRotation(_strokeQuat);
}

/** The tip reaches the ball: sound, status, and the follow-through timer starts. */
function onCueContact() {
  swerveTime = 0;
  shotSound(SOUND_STRIKE, stroke.strength, 0, cueBall.pos.toArray()); // the "tock" of the tip hitting the ball
  updateStatusDisplay(true);
  strokeContacted = true;
  cueShotTime = 0;
}

/** The angle in (−π, π]. */
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * After a hit off center: pull the ball's direction back toward the aim line (see CUE_SQUIRT_MAX_DEG).
 * Speed and spin stay; the horizontal part of the spin turns with the direction so that the ball
 * still rolls consistently.
 */
function limitSquirt(s) {
  const v = cueBall.body.linvel();
  const speed = Math.hypot(v.x, v.z);
  if (speed < 0.1) return;
  const heading = Math.atan2(v.x, -v.z); // 0 = along −z
  const wanted = -s.aimAngle - s.x * THREE.MathUtils.degToRad(CUE_SQUIRT_MAX_DEG);
  const psi = -wrapAngle(wanted - heading); // the rotation about the vertical axis that gets it there
  const [c, sn] = [Math.cos(psi), Math.sin(psi)];
  const w = cueBall.body.angvel();
  cueBall.body.setLinvel({ x: v.x * c + v.z * sn, y: v.y, z: -v.x * sn + v.z * c }, true);
  cueBall.body.setAngvel({ x: w.x * c + w.z * sn, y: w.y, z: -w.x * sn + w.z * c }, true);
}

let swerveTime = SWERVE_SECONDS; // seconds since the hit

/**
 * Swerve (see SWERVE_BOOST): while the white ball slides on the cloth the friction pulls against the
 * slip of the contact point; its part across the ball's direction is what bends the path. It is
 * multiplied here, in the first seconds after the hit.
 * @param {number} dt — physics step (s)
 */
function applySwerve(dt) {
  swerveTime += dt;
  if (SWERVE_BOOST <= 1 || swerveTime > SWERVE_SECONDS || !cueBall || cueBall.inPocket) return;
  if (cueBall.body.translation().y < TABLE_H - 0.01) return;
  const v = cueBall.body.linvel();
  const w = cueBall.body.angvel();
  const speed = Math.hypot(v.x, v.z);
  // speed of the contact point on the cloth (the point below the center): 0 = rolling, no slip
  const ux = v.x + BALL_R * w.z;
  const uz = v.z - BALL_R * w.x;
  const slip = Math.hypot(ux, uz);
  if (speed < 0.05 || slip < 0.02) return;
  const [hx, hz] = [v.x / speed, v.z / speed];
  const along = (ux * hx + uz * hz) / slip;
  const [sideX, sideZ] = [ux / slip - along * hx, uz / slip - along * hz]; // slip direction across the path
  const k = (SWERVE_BOOST - 1) * ((TABLE_FRICTION + BALL_FRICTION) / 2) * 9.81 * cueBall.body.mass() * dt;
  cueBall.body.applyImpulse({ x: -sideX * k, y: 0, z: -sideZ * k }, true); // friction acts against the slip
}

/** Safety net: if the physical hit did not move the ball, give it the intended impulse. */
function ensureBallWasHit(s) {
  const v = cueBall.body.linvel();
  if (Math.hypot(v.x, v.z) >= 0.3 * s.ballSpeed) return;
  console.warn("[Backroom Billard] cue stroke did not move the ball, applying the impulse");
  const m = cueBall.body.mass();
  cueBall.body.applyImpulse(
    {
      x: -Math.sin(s.aimAngle) * s.ballSpeed * m,
      y: 0,
      z: -Math.cos(s.aimAngle) * s.ballSpeed * m,
    },
    true
  );
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
  const powerThumb = document.getElementById("power-thumb");
  const powerDim = document.getElementById("power-dim");
  const powerPct = document.getElementById("power-percent");
  /** Set the shot power; always a whole percent (1 % steps). */
  function setPower(val) {
    const pct = Math.max(POWER_MIN, Math.min(POWER_MAX, Math.round(val * 100)));
    selectedPower = pct / 100;
    const fraction = (pct - POWER_MIN) / (POWER_MAX - POWER_MIN); // 0 = bottom, 1 = top
    powerThumb.style.bottom = fraction * 100 + "%";
    powerDim.style.height = (1 - fraction) * 100 + "%";
    powerPct.textContent = pct;
    slider.setAttribute("aria-valuenow", String(pct));
  }

  // Vertical slider: mouse, touch and pen via pointer events (drag anywhere on the slider)
  const setPowerFromPointer = (e) => {
    const rect = slider.getBoundingClientRect();
    const fraction = 1 - (e.clientY - rect.top) / rect.height;
    setPower((POWER_MIN + fraction * (POWER_MAX - POWER_MIN)) / 100);
  };
  slider.addEventListener("pointerdown", (e) => {
    slider.setPointerCapture(e.pointerId);
    setPowerFromPointer(e);
  });
  slider.addEventListener("pointermove", (e) => {
    if (slider.hasPointerCapture(e.pointerId)) setPowerFromPointer(e);
  });
  setPower(selectedPower); // sync the UI with the default value

  // MOUSE WHEEL: set shot power continuously and precisely
  window.addEventListener(
    "wheel",
    (e) => {
      if (cameraMode !== "fps") return;
      // Scroll up (-deltaY) = more power, scroll down (+deltaY) = less power
      const delta = -Math.sign(e.deltaY) * 0.01; // 1 % per notch
      setPower(selectedPower + delta);
    },
    { passive: true }
  );

  // On-screen shoot button
  const fireBtn = document.getElementById("btn-fire-shot");
  fireBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fireCueStrike();
    fireBtn.blur(); // give up focus so a key does not trigger the button again
  });

  // The nub on the disc above the shoot button: drag it to meet the ball off-center (double-click = center)
  const nub = document.getElementById("fire-nub");
  const disc = nub.parentElement;
  const showNub = () => {
    const reach = disc.clientWidth / 2 - nub.clientWidth / 2 - 4;
    nub.style.transform = `translate(${strikeNub.x * reach}px, ${-strikeNub.y * reach}px)`;
  };
  const moveNub = (e) => {
    const r = disc.getBoundingClientRect();
    const reach = r.width / 2 - nub.clientWidth / 2 - 4;
    let x = (e.clientX - r.left - r.width / 2) / reach;
    let y = -(e.clientY - r.top - r.height / 2) / reach;
    const len = Math.hypot(x, y);
    if (len > 1) [x, y] = [x / len, y / len];
    [strikeNub.x, strikeNub.y] = [x, y];
    showNub();
  };
  nub.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    nub.setPointerCapture(e.pointerId);
    nub.addEventListener("pointermove", moveNub);
  });
  nub.addEventListener("pointerup", () => nub.removeEventListener("pointermove", moveNub));
  nub.addEventListener("dblclick", () => {
    [strikeNub.x, strikeNub.y] = [0, 0];
    showNub();
  });

  // Mouse control (drag to aim; a click does not shoot: E or the SHOOT button does)
  container.addEventListener("mousedown", (e) => {
    if (e.button === 0 && tryPianoPress(e)) return; // a key of the piano: play it, no aiming, no shot
    if (pianoMode !== "off") return; // seated at the piano: the mouse only plays
    if (cameraMode === "free") {
      // Free camera: drag to look (the mouse is not captured: a click on the radio, a face or the piano uses the pointer)
      if (e.button === 0) {
        freeLookDragging = true;
        freeClickDistance = 0;
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

  /** A click on the radio's power knob toggles the radio (true if the knob was hit). */
  function tryRadioClick(e) {
    if (!radio && !faceBall) return false;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    };
    return !!radio?.handleClick(camera, ndc) || !!faceBall?.handleClick(camera, ndc);
  }

  /** The pointer in normalized device coordinates. */
  function pointerNdc(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -(((e.clientY - rect.top) / rect.height) * 2 - 1) };
  }
  /** A press on a piano key plays the note (true if a key was hit). */
  function tryPianoPress(e) {
    if (mpMode && !pianoMine) return false; // multiplayer: only the one who sits there plays
    return !!piano && piano.pressAt(camera, pointerNdc(e));
  }

  window.addEventListener("mouseup", (e) => {
    piano?.release();
    if (freeLookDragging && freeClickDistance < 5 && cameraMode === "free") tryRadioClick(e);
    freeLookDragging = false;
    if (isMouseDown && cameraMode === "fps") {
      if (totalDragDist < 5) tryRadioClick(e); // (clicked briefly: maybe the radio knob)
    }
    isMouseDown = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (pianoMode !== "off" || cameraFlight.active) return;
    if (cameraMode === "free") {
      // Mouse look: only while dragging (button down)
      if (freeLookDragging) {
        freeClickDistance += Math.abs(e.movementX) + Math.abs(e.movementY);
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
    // Vertical tilt of the camera
    aimElevation = THREE.MathUtils.clamp(aimElevation + dy * 0.005, FP_CAM_MIN_ELEVATION, FP_CAM_MAX_ELEVATION);
    if (dy !== 0) elevationGlide = false; // the player tilts the camera: his choice wins
  });

  // The piano: F (or the button) sits down at it when the free camera is close, Esc (or the button) gets up; seated, the keys play it.
  // This runs before the game keys and takes all keys while seated.
  document.addEventListener(
    "keydown",
    (e) => {
      if (!piano || settings.isOpen() || isStartScreenOpen() || drinkMenu.isOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      const seated = pianoMode === "on" || pianoMode === "entering";
      if (!seated && e.code === "KeyF" && cameraMode === "free" && pianoMode === "off" && piano.isNear(camera)) {
        if (!e.repeat) enterPiano(); // F sits down; once seated it is only a key (Esc or the button gets up)
      } else if (!seated) {
        return;
      } else if (e.code === "Escape") {
        leavePiano();
      } else if (pianoMode === "on") {
        piano.keyDown(e.code, e.repeat);
      }
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
  document.addEventListener(
    "keyup",
    (e) => {
      if (!piano) return;
      if (piano.keyUp(e.code) || pianoMode === "on" || pianoMode === "entering") e.stopPropagation(); // seated, the keys are not for the game
    },
    true
  );
  document.getElementById("btn-piano").addEventListener("click", togglePiano);

  // Keyboard: C switches the camera, N resets; E shoots; in cue view arrow keys / A & D aim; in free camera mode WASD move, space goes up and shift goes down.
  window.addEventListener("keydown", (e) => {
    if (settings.isOpen() || isStartScreenOpen()) return; // the settings or the start screen are up: the game keys do nothing
    heldKeys.add(e.code);
    if (e.code === "KeyC" && !e.repeat) {
      toggleCamera();
      return;
    }
    if (drinkMenu.isOpen()) return; // the menu is open: the other keys do nothing
    if (e.code === "KeyT" && !e.repeat) {
      smokeDown(); // hold T: draw on the cigarette, release: exhale
      return;
    }
    if (e.code === "KeyR" && !e.repeat) {
      drinkDown(); // hold R: drink gulp after gulp, release: put the glass back
      return;
    }
    if (e.code === "KeyE" && !e.repeat) {
      fireCueStrike(); // E = shoot (only with the cue camera, see fireCueStrike)
      return;
    }
    if (e.code === "KeyN" && !e.repeat) {
      if (!mpGame.running) setupBalls(); // N = new rack (R is for drinking); in a multiplayer game the database starts the racks
      return;
    }
    if (cameraMode === "free") {
      if (e.code === "Space") e.preventDefault(); // no page scroll / button activation
      return;
    }
    if (e.code === "ArrowUp" || e.code === "KeyW") {
      setPower(selectedPower + 0.01);
    }
    if (e.code === "ArrowDown" || e.code === "KeyS") {
      setPower(selectedPower - 0.01);
    }
  });
  window.addEventListener("keyup", (e) => {
    heldKeys.delete(e.code);
    if (e.code === "KeyT") smokeUp();
    if (e.code === "KeyR") drinkUp();
  });
  window.addEventListener("blur", () => {
    piano?.releaseAll();
    heldKeys.clear();
    smokeUp();
    drinkUp();
  });

  // Touch control for mobile
  let touchX = 0;
  let touchY = 0;
  let touchMoved = false;
  container.addEventListener(
    "touchstart",
    (e) => {
      if (pianoMode === "on" && e.touches.length === 1) {
        const rect = renderer.domElement.getBoundingClientRect();
        const touch = e.touches[0];
        if (piano.pressAt(camera, { x: ((touch.clientX - rect.left) / rect.width) * 2 - 1, y: -(((touch.clientY - rect.top) / rect.height) * 2 - 1) })) return;
      }
      if (e.touches.length === 1) {
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
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
        const dy = e.touches[0].clientY - touchY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touchMoved = true;
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
        aimAngle -= dx * 0.006;
        aimElevation = THREE.MathUtils.clamp(aimElevation + dy * 0.005, FP_CAM_MIN_ELEVATION, FP_CAM_MAX_ELEVATION);
        if (dy !== 0) elevationGlide = false;
      } else if (cameraMode === "free" && pianoMode === "off" && e.touches.length === 1) {
        // Free camera: swipe sideways = turn, swipe up = closer, down = further away
        const dx = e.touches[0].clientX - touchX;
        const dy = e.touches[0].clientY - touchY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touchMoved = true;
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
        freeYaw -= dx * FREE_CAM_TOUCH_TURN;
        camera.position.addScaledVector(_freeForward.set(-Math.sin(freeYaw), 0, -Math.cos(freeYaw)), -dy * FREE_CAM_TOUCH_MOVE);
        confineFreeCamera();
      }
    },
    { passive: true }
  );

  container.addEventListener("touchend", (e) => {
    if (e.cancelable) e.preventDefault(); // prevents the additionally synthesized mouse events (not possible while the page scrolls)
    piano?.release();
    if (cameraMode === "fps" && !touchMoved) {
      fireCueStrike();
    } else if (cameraMode === "free" && pianoMode === "off" && !touchMoved && e.changedTouches.length) {
      tryRadioClick(e.changedTouches[0]); // a tap on the radio
    }
  });

  // Header Buttons
  document.getElementById("btn-camera").addEventListener("click", toggleCamera);

  // Drink button: pressing and holding it is the same as holding R
  const drinkButton = document.getElementById("btn-drink");
  drinkButton.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    drinkButton.setPointerCapture(e.pointerId);
    drinkButton.classList.add("is-held");
    drinkDown();
  });
  const releaseDrink = () => {
    drinkButton.classList.remove("is-held");
    drinkUp();
  };
  drinkButton.addEventListener("pointerup", releaseDrink);
  drinkButton.addEventListener("pointercancel", releaseDrink);

  // Smoke button: pressing and holding it is the same as holding T
  const smokeButton = document.getElementById("btn-smoke");
  smokeButton.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    smokeButton.setPointerCapture(e.pointerId);
    smokeButton.classList.add("is-held");
    smokeDown();
  });
  const releaseSmoke = () => {
    smokeButton.classList.remove("is-held");
    smokeUp();
  };
  smokeButton.addEventListener("pointerup", releaseSmoke);
  smokeButton.addEventListener("pointercancel", releaseSmoke);
  const againButton = document.getElementById("game-over-again");
  againButton.addEventListener("click", () => {
    hideGameOver(); // the stake window is behind it
    stakeWindow.setBlocked(false);
  });
  document.getElementById("btn-restart").addEventListener("click", () => {
    if (mpGame.running) return;
    setupBalls();
    updateStatusDisplay(false);
  });
  settings = createSettings(
    () => {
      if (mpGame.running) return;
      setupBalls();
      updateStatusDisplay(false);
    },
    () => ({ name: displayName(loadProfile(), "full"), money: wallet.format(wallet.balance) })
  );

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
let freeClickDistance = 0; // mouse movement since the button went down (a click, not a drag)
/** Where the free camera was left when switching back to the cue view. */
const freeSavedPosition = new THREE.Vector3();
let freePoseSaved = false;
/** Currently held keys (KeyboardEvent.code) for the free camera movement. */
const heldKeys = new Set();

/** Sit down at the piano (the camera flies to the stool and looks at the keys) or get up. */
function togglePiano() {
  if (pianoMode === "on" || pianoMode === "entering") leavePiano();
  else enterPiano();
}

function enterPiano() {
  if (!piano || cameraMode !== "free" || pianoMode !== "off" || !piano.isNear(camera)) return;
  if (mpMode && (pianoSitter || (mpGame.running && mpGame.myTurn))) return; // somebody sits there, or I am up at the table
  if (mpMode) multiplayer.sitPiano();
  heldKeys.clear();
  pianoReturn.position.copy(camera.position);
  pianoReturn.yaw = freeYaw;
  pianoReturn.pitch = freePitch;
  const seat = piano.seat();
  const look = new THREE.PerspectiveCamera(); // a camera looks along −z (a plain object would look along +z)
  look.position.copy(seat.position);
  look.lookAt(seat.target);
  startPianoMove(seat.position, look.quaternion, "entering");
}

function leavePiano() {
  if (pianoMode !== "on" && pianoMode !== "entering") return;
  piano.releaseAll();
  if (mpMode) multiplayer.leavePiano();
  startPianoMove(pianoReturn.position, new THREE.Quaternion().setFromEuler(new THREE.Euler(pianoReturn.pitch, pianoReturn.yaw, 0, "YXZ")), "leaving");
}

function startPianoMove(position, quaternion, mode) {
  pianoTransition.from.copy(camera.position);
  pianoTransition.fromQuat.copy(camera.quaternion);
  pianoTransition.to.copy(position);
  pianoTransition.toQuat.copy(quaternion);
  pianoTransition.t = 0;
  pianoMode = mode;
  renderPianoButton();
}

/** The camera on its way to the stool or back (smooth). */
function updatePianoMove(dt) {
  if (pianoMode !== "entering" && pianoMode !== "leaving") return;
  pianoTransition.t = Math.min(1, pianoTransition.t + dt / PIANO_SEAT_SECONDS);
  const k = pianoTransition.t * pianoTransition.t * (3 - 2 * pianoTransition.t);
  camera.position.lerpVectors(pianoTransition.from, pianoTransition.to, k);
  camera.quaternion.slerpQuaternions(pianoTransition.fromQuat, pianoTransition.toQuat, k);
  if (pianoTransition.t < 1) return;
  pianoMode = pianoMode === "entering" ? "on" : "off";
  renderPianoButton();
}

/** The piano button: shown close to the piano (free camera) and while seated; "play" or "leave". */
function renderPianoButton() {
  const seated = pianoMode === "on" || pianoMode === "entering";
  const dock = document.getElementById("piano-dock");
  const show = seated || (cameraMode === "free" && pianoMode === "off" && !!piano && piano.isNear(camera));
  if (dock.hidden === show) dock.hidden = !show;
  const cap = seated ? "Esc" : "F"; // F sits down, Esc (or the button) gets up
  const capElement = document.getElementById("piano-cap");
  if (capElement.textContent !== cap) capElement.textContent = cap;
  const taken = !seated && !!pianoSitter;
  const label = taken ? t("piano.taken", { name: pianoSitter }) : t(seated ? "piano.leave" : "piano.play");
  const button = document.getElementById("btn-piano");
  if (button.disabled !== taken) button.disabled = taken; // (somebody else sits there)
  const labelElement = document.getElementById("piano-label");
  if (labelElement.textContent !== label) labelElement.textContent = label; // (called every frame: only touch the page on a change)
}

function toggleCamera() {
  if (pianoMode !== "off") return; // sitting at the piano: first get up
  if (mpGame.running && !mpGame.myTurn && cameraMode === "free") return; // the other one is up: stay in the free camera and watch
  cameraMode = cameraMode === "fps" ? "free" : "fps";
  const free = cameraMode === "free";
  cameraFlight.from.copy(camera.position);
  cameraFlight.fromQuat.copy(camera.quaternion);

  if (free) {
    // Multiplayer: from the cue camera back and up (and to the side of the seat); else the first time the default
    // observer pose, afterwards where the free camera was left
    if (mpMode) {
      placeFreeCameraBehindCue();
    } else if (!freePoseSaved) {
      camera.position.set(...FREE_CAM_START_POSITION);
      camera.lookAt(...FREE_CAM_START_TARGET);
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
      freeYaw = euler.y;
      freePitch = euler.x;
    } else {
      camera.position.copy(freeSavedPosition);
      camera.rotation.set(freePitch, freeYaw, 0, "YXZ");
    }
    cameraFlight.to.copy(camera.position); // the free view is fixed: fly there
    cameraFlight.toQuat.copy(camera.quaternion);
    camera.position.copy(cameraFlight.from);
    camera.quaternion.copy(cameraFlight.fromQuat);
  } else {
    freeSavedPosition.copy(camera.position);
    freePoseSaved = true;
    freeLookDragging = false;
    aimElevation = FP_CAM_DEFAULT_ELEVATION; // back at the table: flat, as at every turn
  }

  cameraFlight.active = true;
  cameraFlight.t = 0;
  renderCameraLabel();
  document.getElementById("aim-crosshair").style.display = free ? "none" : "flex";
}

/** After the view was placed for this frame: show the camera on its way from the old view to it. */
function applyCameraFlight(dt) {
  cameraFlight.t = Math.min(1, cameraFlight.t + dt / CAMERA_FLIGHT_SECONDS);
  const k = cameraFlight.t * cameraFlight.t * (3 - 2 * cameraFlight.t);
  if (cameraMode === "fps") {
    // the cue view moves (the focus eases to the ball): fly to where it is now
    cameraFlight.to.copy(camera.position);
    cameraFlight.toQuat.copy(camera.quaternion);
  }
  camera.position.lerpVectors(cameraFlight.from, cameraFlight.to, k);
  camera.quaternion.slerpQuaternions(cameraFlight.fromQuat, cameraFlight.toQuat, k);
  if (cameraFlight.t >= 1) cameraFlight.active = false;
}

/** Multiplayer: the free camera starts behind and above the cue camera, to the side of the seat, looking down at the table. */
function placeFreeCameraBehindCue() {
  camera.getWorldDirection(_freeForward);
  _freeForward.y = 0;
  if (_freeForward.lengthSq() < 1e-6) _freeForward.set(0, 0, -1);
  _freeForward.normalize();
  const sign = mySideNow === 1 ? 1 : -1; // the two seats go to different sides (not through the head of the other one)
  _freeRight.set(-_freeForward.z, 0, _freeForward.x);
  camera.position.addScaledVector(_freeForward, -FREE_CAM_BACK).addScaledVector(_freeRight, sign * FREE_CAM_SIDE);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y + FREE_CAM_UP, FREE_CAM_MIN_Y, FREE_CAM_MAX_Y);
  freeYaw = Math.atan2(-_freeForward.x, -_freeForward.z);
  freePitch = FREE_CAM_PITCH;
  camera.rotation.set(freePitch, freeYaw, 0, "YXZ");
  confineFreeCamera();
}

/** Move and rotate the free camera: WASD, space = up, shift = down, mouse look. */
const _freeForward = new THREE.Vector3();
const _freeRight = new THREE.Vector3();
const _freeMove = new THREE.Vector3();
function updateFreeCamera(dt) {
  camera.rotation.set(freePitch, freeYaw, 0, "YXZ");

  const forward = _freeForward.set(-Math.sin(freeYaw), 0, -Math.cos(freeYaw));
  const right = _freeRight.set(Math.cos(freeYaw), 0, -Math.sin(freeYaw));
  const move = _freeMove.set(0, 0, 0);
  // (arrow keys too: near the piano the letters play)
  if (heldKeys.has("KeyW") || heldKeys.has("ArrowUp")) move.add(forward);
  if (heldKeys.has("KeyS") || heldKeys.has("ArrowDown")) move.sub(forward);
  if (heldKeys.has("KeyD") || heldKeys.has("ArrowRight")) move.add(right);
  if (heldKeys.has("KeyA") || heldKeys.has("ArrowLeft")) move.sub(right);
  if (heldKeys.has("Space")) move.y += 1;
  if (heldKeys.has("ShiftLeft") || heldKeys.has("ShiftRight")) move.y -= 1;

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(FREE_CAM_SPEED * dt);
    camera.position.add(move);
    confineFreeCamera();
  }
}

/** The free camera stays inside the room and between its heights (it flies above the chairs, 1.5 m up, so tables need no keep-out area). */
function confineFreeCamera() {
  const m = FREE_CAM_ROOM_MARGIN;
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -ROOM_WIDTH / 2 + m, ROOM_WIDTH / 2 - m);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -ROOM_LENGTH / 2 + m, ROOM_LENGTH / 2 - m);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, FREE_CAM_MIN_Y, FREE_CAM_MAX_Y);
  // not into the head of another guest: pushed out (two heads never take the same place, and nobody sees through a head)
  for (const head of multiplayer?.heads() ?? []) {
    _freeMove.set(camera.position.x - head.x, camera.position.y - head.y, camera.position.z - head.z);
    const distance = _freeMove.length();
    if (distance >= FREE_CAM_HEAD_DISTANCE) continue;
    if (distance < 1e-4) _freeMove.set(1, 0, 0);
    camera.position.set(head.x, head.y, head.z).addScaledVector(_freeMove.normalize(), FREE_CAM_HEAD_DISTANCE);
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

/** The text key of why the game ended (see endGame). */
let gameOverReason = "game.lost.reason";
let gameOverParams = {};

/** Show the end of the game; shots are blocked until the balls are racked again. */
function endGame(won, reasonKey = won ? "game.won.reason" : "game.lost.reason", params = {}, neutral = false) {
  gameState = neutral ? "over" : won ? "won" : "lost";
  gameOverReason = reasonKey;
  gameOverParams = params;
  const overlay = document.getElementById("game-over");
  if (!overlay) return;
  overlay.classList.toggle("game-over--won", won);
  renderGameOver();
  overlay.hidden = false;
  stakeWindow?.setBlocked(true); // (the stake window for the next game waits behind it)
}

/** (Re-)render the game-over texts in the current language. */
function renderGameOver() {
  if (gameState === "playing") return;
  const key = gameState === "won" ? "game.won" : gameState === "over" ? "game.over" : "game.lost";
  document.getElementById("game-over-title").textContent = t(`${key}.title`);
  document.getElementById("game-over-text").textContent = t(gameOverReason, gameOverParams);
}

/** Re-render all dynamic (JS-generated) texts after a language change. */
function renderDynamicTexts() {
  updateStatusDisplay(isCueMoving);
  renderCameraLabel();
  renderPianoButton();
  renderNote();
  renderMatch();
  renderGameOver();
  document.querySelectorAll(".pocketed-ball").forEach((dot) => {
    dot.title = t("pocketed.ball", { n: dot.dataset.ballId });
  });
}
onLanguageChange(renderDynamicTexts);

function hideGameOver() {
  stakeWindow?.setBlocked(false);
  document.getElementById("btn-restart").hidden = false;
  document.getElementById("game-over-again").hidden = true;
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
    mpShot?.pocketed.push(b.id);
    if (b.id === BLACK_BALL_ID && gameState === "playing" && !mpGame.running) { // (in multiplayer the database decides)
      // Black 8: only allowed as the LAST ball, otherwise the game is lost
      const othersLeft = balls.some(
        (o) => !o.isCue && o.id !== BLACK_BALL_ID && !o.inPocket
      );
      endGame(!othersLeft);
    }
    return;
  }

  cueRespawnWait = 0; // the white ball comes back once the other balls lie still (see stepPhysics)
  if (mpShot) mpShot.whiteGone = true;
}

/** The white ball is put back on a free spot (it was pocketed or shot off the table). */
function respawnCueBall() {
  cueRespawnWait = null;
  const b = cueBall;
  const spot = findFreeCueSpot();
  b.body.setEnabled(true);
  b.body.setTranslation({ x: spot.x, y: TABLE_H + BALL_R + 0.0005, z: spot.z }, true);
  b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  b.inPocket = false;
  physicsAwake = PHYSICS_AWAKE_STEPS; // the ball settles on the cloth
}

/** A ball that starts to drop into a pocket makes the rim tick and the slide into the cup. */
function checkPocketEntry(b, horizontalSpeed) {
  if (b.inPocket) return;
  const dropping = b.pos.y < TABLE_H + BALL_R - 0.004;
  let overHole = false;
  for (const spec of pocketSpecs) {
    const dx = b.pos.x - spec.center[0];
    const dz = b.pos.z - spec.center[2];
    if (dx * dx + dz * dz < spec.radius * spec.radius) {
      overHole = true;
      break;
    }
  }
  if (overHole && dropping && !b.inHole) {
    b.inHole = true;
    shotSound(SOUND_POCKET_ENTRY, horizontalSpeed, b.id, b.pos.toArray());
  } else if (!overHole) {
    b.inHole = false;
  }
}

/** Remember the ball's velocity before the physics step (to measure impact strength afterwards). */
function rememberVelocity(b) {
  const v = b.body.linvel();
  b.preVel.set(v.x, v.y, v.z);
}

/**
 * Ball–ball impacts for the sounds. Rapier only reports NEW contacts, but in a rack the balls
 * already touch, so a shock travelling through them would be silent. Instead: two touching balls
 * that were approaching each other before the step and are separating/stopped after it hit.
 */
const impactPositions = new Float64Array(3 * 32);
function detectBallImpacts() {
  const touch = 2 * BALL_R + BALL_TOUCH_DISTANCE;
  const pos = impactPositions;
  // every ball position is read from the physics world once per step (not once per pair)
  for (let i = 0; i < balls.length; i++) {
    const t = balls[i].body.translation();
    pos[3 * i] = t.x;
    pos[3 * i + 1] = t.y;
    pos[3 * i + 2] = t.z;
  }
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (a.inPocket) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      if (b.inPocket) continue;
      const dx = pos[3 * j] - pos[3 * i];
      const dz = pos[3 * j + 2] - pos[3 * i + 2];
      if (dx * dx + dz * dz > touch * touch) continue;
      const d = Math.hypot(dx, dz) || 1;
      const nx = dx / d;
      const nz = dz / d;
      const va = a.body.linvel();
      const vb = b.body.linvel();
      const closingBefore = (a.preVel.x - b.preVel.x) * nx + (a.preVel.z - b.preVel.z) * nz;
      const closingAfter = (va.x - vb.x) * nx + (va.z - vb.z) * nz;
      if (closingBefore > 0 && closingAfter < closingBefore * 0.5) {
        shotSound(SOUND_BALL_HIT, closingBefore, a.id * 100 + b.id, [
          (pos[3 * i] + pos[3 * j]) / 2,
          (pos[3 * i + 1] + pos[3 * j + 1]) / 2,
          (pos[3 * i + 2] + pos[3 * j + 2]) / 2,
        ]);
      }
    }
  }
}

/** How much the ball's velocity changed in the last physics step (m/s). */
function velocityChange(b) {
  const v = b.body.linvel();
  return Math.hypot(v.x - b.preVel.x, v.y - b.preVel.y, v.z - b.preVel.z);
}

/**
 * Physics with a fixed time step (Rapier). A ball only counts as pocketed on impact in the cup.
 * @param {number} frameDt — frame time in seconds
 */
function stepPhysics(frameDt) {
  // The white ball is gone: it returns when the other balls lie still (and the stroke is over)
  if (cueRespawnWait !== null) {
    cueRespawnWait += frameDt;
    if (cueRespawnWait >= CUE_RESPAWN_DELAY && !isCueMoving && (!stroke || stroke.phase === "done") && pendingRemoval.length === 0) respawnCueBall();
  }
  // Everything lies still: nothing can change, so the physics world is not stepped at all
  if (!stroke && !isCueMoving && pendingRemoval.length === 0 && physicsAwake <= 0) {
    physicsAcc = 0;
    updateRollingSound(noRolling);
    return;
  }
  physicsAcc += frameDt;
  let steps = 0;
  while (physicsAcc >= PHYSICS_STEP && steps < 16) {
    // While the cue is snapping forward and hitting the ball, use finer sub-steps so the fast
    // tip does not penetrate the ball (keeps the shot strength independent of the step phase)
    const fine = stroke && (stroke.phase === "forward" || stroke.phase === "follow");
    const sub = fine ? CUE_STROKE_SUBSTEPS : 1;
    physics.world.timestep = PHYSICS_STEP / sub;
    for (let i = 0; i < sub; i++) {
      advanceCueStroke(PHYSICS_STEP / sub);
      for (const b of balls) rememberVelocity(b);
      physics.world.step(physics.eventQueue);
      detectBallImpacts();
      if (!stroke || stroke.phase === "done") applySwerve(physics.world.timestep);
      let foulBall = null; // the cue tip touched a coloured ball (see below)
      physics.eventQueue.drainCollisionEvents((h1, h2, started) => {
        if (!started) return;
        const ball1 = ballByCollider.get(h1);
        const ball2 = ballByCollider.get(h2);
        if (h1 === physics.cue.collider.handle || h2 === physics.cue.collider.handle) {
          const touched = ball1 ?? ball2;
          if (touched === cueBall) tipTouchedCueBall = true;
          else if (touched) foulBall = touched;
          return;
        }
        const pocketId = physics.cupFloors.get(h1) ?? physics.cupFloors.get(h2);
        if (pocketId) {
          const ball = ball1 ?? ball2;
          if (ball) {
            // Landing on the cup floor: Δv = (1 + restitution) × impact speed
            shotSound(SOUND_CUP_LANDING, velocityChange(ball) / 1.5, ball.id, ball.pos.toArray());
            onBallPocketed(ball, pocketId);
          }
        } else if (
          (ball1 && physics.cupWalls.has(h2)) ||
          (ball2 && physics.cupWalls.has(h1))
        ) {
          const ball = ball1 ?? ball2;
          shotSound(SOUND_CUP_WALL, velocityChange(ball) / 1.5, ball.id, ball.pos.toArray());
        } else if (
          (ball1 && physics.cushionColliders.has(h2)) ||
          (ball2 && physics.cushionColliders.has(h1))
        ) {
          // Ball–cushion: Δv = (1 + restitution) × impact speed
          const ball = ball1 ?? ball2;
          shotSound(SOUND_CUSHION_HIT, velocityChange(ball) / (1 + CUSHION_RESTITUTION), ball.id, ball.pos.toArray());
        }
      });
      // The tip hit a coloured ball before it touched the white one (both in one step: the white counts): lost at once
      if (foulBall && !tipTouchedCueBall && gameState === "playing") {
        if (mpGame.running) {
          if (mpShot) mpShot.foul = true; // the database ends the game
        } else endGame(false, "game.foul.reason");
      }
    }
    physicsAcc -= PHYSICS_STEP;
    steps++;
    if (physicsAwake > 0) physicsAwake--;
  }
  physics.world.timestep = PHYSICS_STEP;
  if (steps === 16) physicsAcc = 0; // do not catch up after a long stall

  // Delete pocketed object balls from the cup
  while (pendingRemoval.length) removeBall(pendingRemoval.pop());

  let moving = false;
  const rolling = []; // balls rolling on the table: speed and position (rolling sound)
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    syncBallFromBody(b);

    // Stray ball (jumped off the table): put it back on the table
    if (!b.inPocket && (Math.abs(b.pos.x) > 1.2 || Math.abs(b.pos.z) > 1.8 || b.pos.y < 0.5)) {
      console.warn("[Backroom Billard] ball outside the table, resetting it", b.id);
      if (b.isCue) {
        // The white ball left the table: it counts like a pocketed one (it comes back when the others lie still)
        b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        b.body.setTranslation({ x: 0, y: -2, z: 0 }, true); // out of sight, below the floor
        b.body.setEnabled(false);
        b.inPocket = true;
        cueRespawnWait = 0;
        if (mpShot) mpShot.whiteGone = true;
        continue;
      }
      const spot = findFreeCueSpot();
      b.body.setTranslation({ x: spot.x, y: TABLE_H + BALL_R + 0.0005, z: spot.z }, true);
      b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      continue;
    }

    const lin = b.vel; // read from the body by syncBallFromBody just above
    const ang = b.body.angvel();
    const speed = Math.hypot(lin.x, lin.y, lin.z);
    const surface = Math.hypot(ang.x, ang.y, ang.z) * BALL_R;
    const onTable = b.pos.y > TABLE_H - 0.01;
    if (onTable && !b.inPocket && speed > 0.03) rolling.push({ speed: Math.hypot(lin.x, lin.z), position: b.pos.toArray() });
    checkPocketEntry(b, Math.hypot(lin.x, lin.z));
    if (onTable && speed < REST_LINEAR_SPEED && surface < REST_SURFACE_SPEED) {
      b.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
      b.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    } else if (!b.inPocket && (speed > 0.02 || !onTable)) {
      moving = true;
    }
  }

  updateRollingSound(rolling);

  // The table counts as still (no ball faster than 2 cm/s): stop what is left. Otherwise a ball that
  // creeps along at 1-2 cm/s keeps this speed while the physics sleeps and goes on rolling "by itself"
  // as soon as the next shot wakes it up, the white one included.
  if (!moving) {
    for (const b of balls) {
      if (b.inPocket) continue;
      b.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
      b.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
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
let perfHud = null; // developer overlay, only with ?perf in the URL (perf-hud.js)

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop);
  perfHud?.loopStart(currentTime);

  const frameSeconds = (currentTime - lastTime) / 1000;
  const dt = Math.min(frameSeconds, 0.033);
  lastTime = currentTime;

  // Physics step
  stepPhysics(dt);
  applyReplay(dt); // the shot of the other one (multiplayer), over what the physics put on the screen

  // The table is still for a moment → the cue camera may return to the shot position
  if (shotInProgress) {
    const strokeFinished = !stroke || stroke.phase === "done";
    if (strokeFinished && !isCueMoving && cueBall && !cueBall.inPocket) {
      shotRestTimer += dt;
      if (shotRestTimer >= SHOT_REST_DELAY) {
        shotInProgress = false;
        elevationGlide = true; // the next turn starts flat again
        stroke = null;
        if (mpShot) reportShot();
      }
    } else {
      shotRestTimer = 0;
    }
  }

  // Turning with the keys (A/D, arrows) — continuous, also while the balls roll
  if (cameraMode === "fps") {
    const turn = (heldKeys.has("ArrowLeft") || heldKeys.has("KeyA") ? 1 : 0) - (heldKeys.has("ArrowRight") || heldKeys.has("KeyD") ? 1 : 0);
    aimAngle += turn * FP_CAM_KEY_TURN_SPEED * dt;
  }

  // The player's condition: time passes, the cue and aim line sway, the bars move
  playerState.update(dt);
  aimSway = playerState.sway(performance.now() / 1000);
  aimSwayPitch = playerState.sway(performance.now() / 1000 + SWAY_PITCH_OFFSET);
  setMarker(hud.markerBody, 50 + playerState.body * 50);
  setMarker(hud.markerNicotine, 50 + playerState.nicotine * 50);

  const packCount = packs.packs[sideOf(camera)].count;
  if (packCount !== hud.packCount) {
    hud.packCount = packCount;
    (hud.packCountElement ??= document.getElementById("pack-count")).textContent = packCount;
  }

  const sipCount = drinking.sipsLeft(camera);
  if (sipCount !== hud.sipCount) {
    hud.sipCount = sipCount;
    (hud.sipCountElement ??= document.getElementById("sip-count")).textContent = sipCount;
  }

  // Cue positioning & distance adjusted to the selected power
  if (cueBall && cueStickPivot) {
    // After the shot the cue stays where it struck; it returns once the table is still
    if (remoteCue.active) {
      // the one who is up: his cue at the ball (the ball of the replay, if one is running)
      if (remoteCue.place) cueStickPivot.position.set(remoteCue.place.x, remoteCue.place.y, remoteCue.place.z); // where he struck: it stays there
      else cueStickPivot.position.copy(cueBall.mesh.position);
      cueStickPivot.rotation.y = remoteCue.angle;
    } else if (!shotInProgress) {
      cueStickPivot.position.set(cueBall.pos.x, cueBall.pos.y, cueBall.pos.z);
      cueStickPivot.rotation.y = aimAngle + aimSway;
    }
    cueStickPivot.visible = true; // also visible with the free camera (carried)

    // Aiming: the tip rests close to the ball; during a shot the stroke animation drives the gap
    cueGap = remoteCue.active ? remoteCue.gap : stroke ? stroke.gap : CUE_AIM_GAP;
    if (mpShot) {
      // my shot is written down for the others: the cue and where the balls are
      recorder.frame(
        performance.now(),
        { angle: cueStickPivot.rotation.y, pitch: stroke ? stroke.pitch : aimCuePitch(), x: (stroke ?? strikeNub).x, y: (stroke ?? strikeNub).y, gap: cueGap, relax: cueRelax, place: cueStickPivot.position },
        balls
      );
    }
    // my aim goes to the others while I am up and looking along the cue (about 15 times per second)
    aimAge += dt;
    if (mpGame.running && mpGame.myTurn && cameraMode === "fps" && !shotInProgress && gameState === "playing" && aimAge >= AIM_SEND_SECONDS) {
      aimAge = 0;
      multiplayer.setAim({ angle: aimAngle + aimSway, elevation: aimCuePitch(), power: selectedPower, nubX: strikeNub.x, nubY: strikeNub.y });
    }

    // Align the aim line with the ball
    if (aimLine) {
      aimLine.visible = remoteCue.active ? false : cameraMode === "fps" && !shotInProgress; // (the aim line of the one who is up is not shown to the others)
      aimLine.position.set(
        cueBall.pos.x,
        cueBall.pos.y - BALL_R + 0.002,
        cueBall.pos.z
      );
      aimLine.rotation.y = aimAngle + aimSway;
    }
  }

  // Camera positioning: the orbit center is the shot position; it stays there while the balls roll
  // and eases to the new cue ball position once the table is still. Turning works at any time.
  if (cameraMode === "fps" && cueBall) {
    if (!shotInProgress) {
      const ease = 1 - Math.exp(-FP_CAM_FOCUS_RATE * frameSeconds);
      camFocus.lerp(cueBall.pos, ease);
      if (elevationGlide) {
        aimElevation += (FP_CAM_DEFAULT_ELEVATION - aimElevation) * ease;
        if (Math.abs(aimElevation - FP_CAM_DEFAULT_ELEVATION) < 0.002) {
          aimElevation = FP_CAM_DEFAULT_ELEVATION;
          elevationGlide = false;
        }
      }
    }
    placeAimCamera();
  } else if (cameraMode === "free") {
    if (pianoMode === "off" && !cameraFlight.active) updateFreeCamera(Math.min(frameSeconds, 0.1)); // real frame time, so the speed does not depend on the physics cap
    else updatePianoMove(frameSeconds);
    renderPianoButton();
  }
  if (cameraFlight.active) applyCameraFlight(frameSeconds);
  if (mpWantCamera) {
    if (cameraMode === mpWantCamera) mpWantCamera = null;
    else if (pianoMode === "off" && !cameraFlight.active) toggleCamera(); // the turn changed: to the cue view when it is mine, else free
  }
  multiplayer?.update(frameSeconds, camera, cameraMode === "free");

  updateAudioListener(camera); // the ears follow the camera
  if (atmosphere) atmosphere.update(frameSeconds);
  if (exhale) exhale.update(frameSeconds, camera);
  if (candles) candles.update(frameSeconds, camera);
  if (drinking) drinking.update(frameSeconds, camera);
  updateRemoteHands(frameSeconds);
  if (multiplayer) sendMyKit(frameSeconds);
  if (glasses) glasses.update(frameSeconds);
  if (smoking) smoking.update(frameSeconds, camera); // before the cigarettes: the smoke follows the ember
  if (cigarettes) cigarettes.update(dt, camera);
  if (radio) radio.update(frameSeconds, camera);

  // The cue is placed after the camera so a carried cue never lags behind it
  if (cueBall && cueStickPivot) {
    updateCueRelax(dt);
    if (remoteCue.active) {
      // the cue of the one who is up: at his head (where his camera is) as soon as he lets go of it, else at the ball
      const head = multiplayer?.poseOf(mpGame.turnSeat);
      if (head) {
        remoteView.position.set(head.x, head.y, head.z);
        remoteView.rotation.set(head.pitch, head.yaw, 0, "YXZ");
      }
      poseCue(cueGap, head ? remoteCue.relax : 0, remoteView);
    } else poseCue(cueGap);
  }

  updateShadows(frameSeconds);
  perfHud?.renderStart();
  renderer.render(scene, camera);
  perfHud?.renderEnd();
}

/**
 * The shadow maps of the lamps are redrawn only when something that casts a shadow in the cones has
 * moved: the balls, the cigarettes (also as they burn down), the lighters and the cue (all else, the
 * furniture, the candles and the radio, stands outside the cones and casts no shadow). A pose
 * "fingerprint" of these objects is compared with the one of the last redraw. The cue's slow sway
 * (no shot under way) is followed at most every LAMP_SHADOW_SWAY_INTERVAL; with nothing moving, no
 * map is drawn at all.
 */
let shadowFingerprint = [NaN, NaN];
let cueFingerprint = [NaN, NaN];
let swayAge = 0;
function addPose(object, sums, deep = true) {
  const p = object.position;
  const q = object.quaternion;
  sums[0] += p.x * 1.13 + p.y * 2.31 + p.z * 3.77 + q.x * 5.9 + q.y * 7.1 + q.z * 11.3 + q.w * 13.7;
  sums[1] += p.x * 17.3 - p.y * 19.1 + p.z * 23.7 - q.x * 29.3 + q.y * 31.7 - q.z * 37.9 + q.w * 41.3;
  if (deep) for (const child of object.children) if (child.isMesh || child.isGroup) addPose(child, sums);
}
function updateShadows(dt) {
  const sums = [0, 0];
  for (const b of balls) addPose(b.mesh, sums);
  for (const child of cigarettes.group.children) if (child.isGroup) addPose(child, sums, false); // only where it lies
  sums[0] += cigarettes.burnSteps(LAMP_SHADOW_BURN_STEP) * 0.37; // and how far it has burnt
  for (const lighter of lighters.lighters) addPose(lighter.group, sums);
  const cue = [0, 0];
  addPose(cueStickPivot, cue);
  swayAge += dt;
  const moved = sums[0] !== shadowFingerprint[0] || sums[1] !== shadowFingerprint[1];
  const cueMoved = cue[0] !== cueFingerprint[0] || cue[1] !== cueFingerprint[1];
  const cueFast = stroke && stroke.phase !== "done"; // the stroke is quick, the sway is slow
  if (moved || (cueMoved && (cueFast || swayAge >= LAMP_SHADOW_SWAY_INTERVAL))) {
    shadowFingerprint = sums;
    cueFingerprint = cue;
    swayAge = 0;
    renderer.shadowMap.needsUpdate = true;
  }
}

/** What my hands do (R: drink, T: smoke, held down): the others see it too (multiplayer). */
const myHand = { drinking: false, smoking: false };
const drinkDown = () => {
  drinking.press(camera);
  myHand.drinking = true;
  multiplayer?.setHand(myHand);
};
const drinkUp = () => {
  drinking.release();
  myHand.drinking = false;
  multiplayer?.setHand(myHand);
};
const smokeDown = () => {
  smoking.press(camera);
  myHand.smoking = true;
  multiplayer?.setHand(myHand);
};
const smokeUp = () => {
  smoking.release(camera);
  myHand.smoking = false;
  multiplayer?.setHand(myHand);
};

/**
 * The others drink and smoke at their seats: for each other seat the same animations run as for me (drinking.js,
 * smoking.js), driven by his R and T keys (as the database tells) and by where his head is. No money, no body marker.
 */
const remoteHands = new Map(); // seat → { side, view, drinking, smoking, held }
const silentWallet = { spend: () => true, say: () => {}, format: String };
function remoteHandOf(seat) {
  let hand = remoteHands.get(seat);
  if (hand) return hand;
  const side = seat === 1 ? 1 : 0; // seat 1 is the +z side of the table, seat 2 the −z side
  hand = {
    side,
    view: new THREE.PerspectiveCamera(), // (a camera: the animations look along its −z)
    drinking: createDrinking({ get player() { return glasses.player.filter((g) => g.side === side); } }, () => {}, () => {}),
    smoking: createSmoking(cigarettes, exhale, lighters, packs, silentWallet, () => {}, () => side),
    held: { drinking: false, smoking: false },
  };
  remoteHands.set(seat, hand);
  return hand;
}
/** Put the view of a remote hand where the head of its guest is. */
function placeRemoteView(seat, hand) {
  const head = multiplayer?.poseOf(seat);
  if (!head) return false;
  hand.view.position.set(head.x, head.y, head.z);
  hand.view.rotation.set(head.pitch, head.yaw, 0, "YXZ");
  hand.view.updateMatrixWorld(true);
  return true;
}
function updateRemoteHands(dt) {
  for (const [seat, hand] of remoteHands) {
    if (!placeRemoteView(seat, hand)) continue;
    hand.drinking.update(dt, hand.view);
    hand.smoking.update(dt, hand.view);
    const waiting = pendingKits.get(seat);
    if (waiting && !hand.drinking.isBusy() && !hand.smoking.isBusy()) applyKit(seat, waiting);
  }
}

/**
 * The panel at the top in the middle, for single and multiplayer: name and money one below the other (with the flag), and the
 * pocketed balls. Single player: only me. Multiplayer alone: me, "VS", "Waiting for another player". Two at the table: both
 * (the left one on seat 1, the right one on seat 2) with a line and "VS" between them, and below each his own pocketed balls.
 */
let matchMode = null; // "single" | "multi" (set when the game starts)
let matchMe = { name: "", country: "" }; // this guest (from his profile)
let myBalance = 0; // his money (the wallet tells)
let matchNames = [{ name: "", country: "", money: 0 }, { name: "", country: "", money: 0 }]; // the two seats (from the database)
let matchPockets = []; // [{ ball, seat }]
let matchTable = { staking: false, offers: [null, null], stake: 0, bids: [] }; // the stake window and the bids (from the database)
const money = (amount) => "$ " + amount.toLocaleString("en-US");
function renderMatch() {
  const panel = document.getElementById("match");
  panel.hidden = matchMode === null;
  if (matchMode === null) return;
  const two = matchMode === "multi" && !!(matchNames[0].name && matchNames[1].name);
  const alone = matchMode === "multi" && !two;
  panel.classList.toggle("match--single", matchMode === "single");
  panel.classList.toggle("match--two", two);
  document.getElementById("pocketed-balls").hidden = two; // (the common list for one player; two have one each)
  const stake = document.getElementById("match-stake");
  stake.hidden = !(two && matchTable.stake > 0);
  stake.textContent = t("match.stake", { amount: money(matchTable.stake) }); // (over the VS)
  // who stands where: (name, country, money) of the left and of the right one
  const mySeat = mySideNow === 1 ? 1 : mySideNow === 0 ? 2 : 0;
  const entry = (seat) => ({ ...matchNames[seat - 1], money: seat === mySeat ? myBalance : matchNames[seat - 1].money });
  const left = two ? entry(1) : { ...matchMe, money: myBalance };
  const right = two ? entry(2) : alone ? { name: t("room.waiting"), country: "", money: null } : null;
  [left, right].forEach((who, i) => {
    const n = i + 1;
    document.getElementById(`match-name-${n}`).textContent = who?.name ?? "";
    const flag = document.getElementById(`match-flag-${n}`);
    flag.hidden = !(who?.country && isCountry(who.country));
    if (!flag.hidden) flag.src = flagUrl(who.country);
    document.getElementById(`match-money-${n}`).textContent = who && who.money !== null ? money(who.money) : "";
    document.getElementById(`match-name-${n}`).parentElement.classList.toggle("is-up", two && mpGame.running && mpGame.turnSeat === n); // (a rounded border: his turn)
    document.getElementById(`match-name-${n}`).classList.toggle("is-waiting", who === right && alone);
    document.getElementById(`match-balls-${n}`).replaceChildren(
      ...(two ? matchPockets : [])
        .filter((p) => p.seat === n)
        .sort((a, b) => a.ball - b.ball)
        .map((p) => {
          const dot = document.createElement("span");
          dot.className = "pocketed-ball";
          dot.style.backgroundColor = "#" + BALL_COLORS[p.ball - 1].toString(16).padStart(6, "0");
          dot.title = t("pocketed.ball", { n: p.ball });
          return dot;
        })
    );
  });
}

/** A multiplayer game event (see multiplayer.js): start, whose turn it is, the end of a shot of somebody else, the end of the game. */
function onMultiplayerGame(e) {
  if (e.kind === "aim") {
    // the one who is up aims: his cue follows (the shot of his that is replayed drives the cue itself)
    Object.assign(remoteAim, { angle: e.angle, pitch: e.pitch, x: e.x, y: e.y });
    if (!remoteCue.active && !replay.active) Object.assign(remoteCue, remoteAim, { gap: CUE_AIM_GAP, relax: 0, place: null });
    remoteCue.active = true;
    return;
  }
  if (e.kind === "shotStart") {
    replay.begin();
    watchedShot = true; // I have seen a game being played (not only found its remains)
    return;
  }
  if (e.kind === "piano") {
    // who sits at the grand piano and what he plays: it sounds from the piano for everybody; if the database stood me up (my turn), I get up
    const wasMine = pianoMine;
    pianoMine = e.mine;
    pianoSitter = e.sitter && !e.mine ? e.sitter : null;
    piano.setRemoteKeys(e.mine ? [] : e.midis);
    if (!e.mine && (wasMine || e.sitter) && (pianoMode === "on" || pianoMode === "entering")) leavePiano();
    renderPianoButton();
    return;
  }
  if (e.kind === "table") {
    matchTable = e;
    // a stake window opens for me while a game-over panel without "Play again" is up (a new opponent came): the panel gives way
    if (e.staking && mySideNow !== null && document.getElementById("game-over-again").hidden) hideGameOver();
    tellStakeWindow();
    renderMatch();
    return;
  }
  if (e.kind === "pockets") {
    matchPockets = e.rows;
    renderMatch();
    return;
  }
  if (e.kind === "kit") {
    applyKit(e.seat, e);
    return;
  }
  if (e.kind === "hand") {
    // the guest on that seat holds R or T (or let go)
    const hand = remoteHandOf(e.seat);
    placeRemoteView(e.seat, hand);
    if (e.drinking !== hand.held.drinking) (e.drinking ? hand.drinking.press(hand.view) : hand.drinking.release());
    if (e.smoking !== hand.held.smoking) (e.smoking ? hand.smoking.press(hand.view) : hand.smoking.release(hand.view));
    hand.held = { drinking: e.drinking, smoking: e.smoking };
    return;
  }
  if (e.kind === "chunk") {
    if (e.index === 0) console.info("[Backroom Billard] multiplayer: the recording of the shot of the other one arrives");
    replay.add(e.index, e.data, performance.now());
    return;
  }
  if (replay.active && (e.kind === "sync" || e.kind === "turn" || e.kind === "over")) {
    queuedEvents.push(e); // wait until the replay of the shot is over
    return;
  }
  if (e.kind === "start") {
    setupBalls(); // a new rack for both
    if (e.isPlayer && e.stake > 0) wallet.spend(e.stake); // my stake goes in (the winner takes both)
    watchedShot = false;
    remoteCue.active = false;
    hideGameOver();
    roomNote("room.gameStart", e.firstName);
  } else if (e.kind === "turn" || e.kind === "init") {
    mpGame.running = true;
    mpGame.myTurn = e.myTurn;
    mpGame.turnSeat = e.turnSeat;
    renderMatch(); // (who is up)
    if (e.myTurn) remoteCue.active = false; // my cue now
    else Object.assign(remoteCue, { relax: 0, place: null }); // his cue is at the ball again (his aim comes next)
    mpWantCamera = e.myTurn ? "fps" : "free"; // the one who is up looks along his cue, the other watches
  } else if (e.kind === "sync") {
    applyRestState(e.balls);
  } else if (e.kind === "over") {
    if (e.isPlayer && e.iWon && e.stake > 0) wallet.setBalance(wallet.balance + 2 * e.stake); // both stakes
    mpGame.running = false;
    mpGame.myTurn = false;
    remoteCue.active = false;
    mpShot = null;
    mpWantCamera = null;
    if (!e.isPlayer && !watchedShot) return; // a game I never saw (found at my arrival, ended by the cleaning up): no news
    // multiplayer: the two players go on to the stake window for the next game; a spectator, or a player whose partner is gone,
    // plays alone on a practice rack until somebody comes (racked at once; the message stands over it)
    const together = e.isPlayer && e.reason !== "timeout" && e.reason !== "left";
    if (e.isPlayer && !together) setupBalls();
    endGame(e.iWon, `game.mp.${e.reason}`, { winner: e.winnerName, loser: e.loserName }, !e.isPlayer);
    document.getElementById("btn-restart").hidden = together;
    const again = document.getElementById("game-over-again");
    again.hidden = !together;
  }
}

/** The replay of the shot of the other one: the balls and the cue as he had them (a little late); at its end the rest of the news is dealt with. */
function applyReplay(dt) {
  if (replay.active) {
    const picture = replay.sample(performance.now());
    if (picture) {
      Object.assign(remoteCue, picture.cue, { active: true });
      for (const s of picture.sounds) playShotSound(s.kind, s.p1, s.p2, s.position); // the clacks and the cue as they were heard
      updateRollingSound(picture.rolling);
      for (const b of balls) {
        const p = picture.balls.get(b.id);
        b.mesh.visible = !!p;
        if (!p) continue;
        b.mesh.position.set(p.x, p.y, p.z);
        _replayQa.fromArray(p.q[0]);
        _replayQb.fromArray(p.q[1]);
        b.mesh.quaternion.copy(_replayQa).slerp(_replayQb, p.q[2]);
      }
    }
    const ended = queuedEvents.some((e) => e.kind === "sync"); // the shooter has said that the shot is over
    if (ended && (!picture || picture.done)) {
      if (!picture) console.warn("[Backroom Billard] multiplayer: the shot is over, but no recording of it arrived");
      replay.end();
      for (const b of balls) b.mesh.visible = true;
      remoteCue.active = false;
      const waiting = queuedEvents;
      queuedEvents = [];
      for (const e of waiting) onMultiplayerGame(e); // the balls where they lie, whose turn it is, the end
    }
    return;
  }
  if (remoteCue.active) {
    // smooth aim: the cue follows the (15 Hz) news
    const k = 1 - Math.exp(-dt * 18);
    remoteCue.angle += Math.atan2(Math.sin(remoteAim.angle - remoteCue.angle), Math.cos(remoteAim.angle - remoteCue.angle)) * k;
    remoteCue.pitch += (remoteAim.pitch - remoteCue.pitch) * k;
    remoteCue.x += (remoteAim.x - remoteCue.x) * k;
    remoteCue.y += (remoteAim.y - remoteCue.y) * k;
    remoteCue.gap = CUE_AIM_GAP;
  }
}
const _replayQa = new THREE.Quaternion();
const _replayQb = new THREE.Quaternion();

/** My shot is over: tell the database what happened and where the balls lie; it applies the rules and says who is up. */
function reportShot() {
  recorder.finish(); // the last piece of the recording goes first
  const lying = balls.filter((b) => !b.inPocket);
  multiplayer.endShot({
    foul: mpShot.foul,
    whiteGone: mpShot.whiteGone,
    pocketed: mpShot.pocketed,
    restIds: lying.map((b) => b.id),
    restX: lying.map((b) => b.pos.x),
    restZ: lying.map((b) => b.pos.z),
  }, mpShot.seq);
  mpShot = null;
}

/** The shot of another guest is over: put the balls where they lie on his table (the shot itself is not shown yet). */
function applyRestState(rows) {
  for (const row of rows) {
    const b = balls.find((o) => o.id === row.id);
    if (!b) continue;
    if (row.pocketed) {
      if (!b.isCue && !b.inPocket) {
        b.inPocket = true;
        addPocketedToHud(b);
        removeBall(b);
      }
      continue;
    }
    b.body.setTranslation({ x: row.x, y: TABLE_H + BALL_R + 0.0005, z: row.z }, true);
    b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
  physicsAwake = PHYSICS_AWAKE_STEPS; // the balls settle on the cloth
}

/**
 * The choices of the welcome screen: the money after the purchases, the first drink and the first pack,
 * and the mode. Multiplayer: joins the room first and waits until it is set up (rejects if it fails,
 * then nothing has been applied). Single player: no connection at all, and only one set of glass,
 * pack, lighter and ashtray stands at the table (the seat on the +z side).
 * @param {import("./profile-store.js").Profile} profile
 * @param {"single" | "multi"} mode
 */
export async function applyProfile(profile, mode) {
  mpMode = mode === "multi";
  matchMode = mode;
  matchMe = { name: displayName(profile, "short"), country: profile.country };
  renderMatch();
  myChoice = { drink: profile.firstDrink, pack: profile.firstPack }; // put on his seat as soon as he has one (applySeats)
  if (mode === "multi") await multiplayer.join(profile);
  wallet.setBalance(profile.money);
  faceBall.setProfile(profile);
  if (mode === "single") applySeats([false, true], 1); // one set at the table: the +z seat
}

/** Which seats of the table are taken: only their sets (glass, pack, lighter, ashtray with cigarettes) stand there; `mySide` is this guest's seat. */
let mpMode = false; // this guest is in the multiplayer room (not single player)
let myChoice = null; // what this guest chose at the welcome screen: { drink, pack }
let mySideNow = null; // his seat (0 or 1), null: a spectator
function applySeats(taken, mySide) {
  [0, 1].forEach((side) => {
    glasses.setSeat(side, taken[side]);
    packs.setSeat(side, taken[side]);
    lighters.setSeat(side, taken[side]);
    ashtrays.setSeat(side, taken[side]);
    cigarettes.setSeat(side, taken[side]);
  });
  setMySide(mySide);
  if (myChoice && mySide !== null && mySide !== mySideNow) {
    // he sits (or sits elsewhere now): his drink and his cigarettes stand at his seat, full
    glasses.setSeatGlass(mySide, myChoice.drink, DRINK_SIPS);
    packs.setSeatPack(mySide, myChoice.pack, PACK_SIZE);
  }
  mySideNow = mySide;
}

/** What stands at my seat (drink with the sips left, the cigarettes) goes to the database when it changes (a sip, a new order, a cigarette). */
let kitAge = 0;
function sendMyKit(dt) {
  kitAge += dt;
  if (kitAge < 0.25 || mySideNow === null) return;
  kitAge = 0;
  const glass = glasses.seat(mySideNow);
  const pack = packs.packs[mySideNow];
  multiplayer.setKit({ drink: glass.kind, sips: glass.sipsLeft, pack: pack.design, packCount: pack.count });
}

/** The drink and cigarettes of the guest on another seat: as he has them (when his animation is over, else a moment later). */
const pendingKits = new Map(); // seat → kit
function applyKit(seat, kit) {
  const side = seat === 1 ? 1 : 0;
  const hand = remoteHands.get(seat);
  if (hand && (hand.drinking.isBusy() || hand.smoking.isBusy())) {
    pendingKits.set(seat, kit); // he drinks or smokes right now: his animation shows the change itself
    return;
  }
  pendingKits.delete(seat);
  glasses.setSeatGlass(side, kit.drink, kit.sips);
  packs.setSeatPack(side, kit.pack, kit.packCount);
}

/** What the stake window needs to know: my seat and money, the two at the table. */
function tellStakeWindow() {
  if (!stakeWindow) return;
  const seat = mySideNow === 1 ? 1 : mySideNow === 0 ? 2 : 0;
  stakeWindow.setMe({ seat, balance: myBalance, players: matchNames });
  stakeWindow.setTable(matchTable);
}

/** Multiplayer: somebody came or went. The seats follow; alone, "Waiting for another player" stands on the screen. */
let partnerHere = false; // two sat at the table at the last look
function applyRoom(room) {
  matchNames = room.players;
  const two = !!(room.players[0].name && room.players[1].name);
  // The partner left (no game running): the one who stays gets a fresh rack to play on alone, until somebody comes.
  // (A game that ended because he left keeps its message; its rack is ready already.)
  const endedByLeaving = gameState !== "playing" && /timeout|left/.test(gameOverReason);
  if (partnerHere && !two && room.mySide !== null && !mpGame.running && !endedByLeaving) setupBalls();
  partnerHere = two;
  applySeats(room.taken, room.mySide);
  renderMatch();
  tellStakeWindow();
  if (room.others === 0 && gameState !== "playing" && !mpGame.running) {
    // alone after a game: nobody to play again with, so the way to a practice rack is open
    document.getElementById("btn-restart").hidden = false;
    document.getElementById("game-over-again").hidden = true;
  }
}

function scheduleInit() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
scheduleInit();
