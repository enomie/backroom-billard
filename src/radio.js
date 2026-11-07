/**
 * The old wooden tube radio on a wooden sideboard against a long wall. Switched on by default;
 * the right knob is the power switch (click it). The display shows the station and its state.
 * Audio comes from the radio's two speakers (radio-audio.js). See _docs/radio.md.
 */
import * as THREE from "three";
import { t, onLanguageChange } from "./i18n/index.js";
import { RadioAudio } from "./radio-audio.js";
import { RadioMetadata } from "./radio-metadata.js";
import { ROOM_WIDTH } from "./room-constants.js";
import {
  RADIO_STREAM_URL,
  RADIO_STATION_NAME,
  RADIO_WALL_SIDE,
  RADIO_WALL_Z,
  SIDEBOARD_WIDTH,
  SIDEBOARD_DEPTH,
  SIDEBOARD_HEIGHT,
  RADIO_WIDTH,
  RADIO_HEIGHT,
  RADIO_DEPTH,
  RADIO_SPEAKER_OFFSET_X,
  RADIO_SPEAKER_HEIGHT,
  RADIO_CLICK_DISTANCE,
  RADIO_COLOR_WOOD,
  RADIO_COLOR_GRILLE,
  RADIO_COLOR_BRASS,
  RADIO_COLOR_KNOB,
} from "./radio-constants.js";

/* ---- Textures ----------------------------------------------------------------------------- */

function canvas(width, height) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

function textureFrom(c, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

/** Walnut veneer with grain running along x. */
function woodTexture(repeatX, repeatY) {
  const c = canvas(512, 256);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#8a5a36";
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * 256;
    ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? "40,20,8" : "170,115,70"}, ${0.06 + Math.random() * 0.14})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 8, 340, y + (Math.random() - 0.5) * 8, 512, y);
    ctx.stroke();
  }
  return textureFrom(c, repeatX, repeatY);
}

/** Golden woven speaker cloth. */
function grilleTexture() {
  const c = canvas(256, 128);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#cdaa62";
  ctx.fillRect(0, 0, 256, 128);
  for (let x = 0; x < 256; x += 4) {
    ctx.fillStyle = (x / 4) % 2 ? "rgba(90,60,20,0.35)" : "rgba(255,230,160,0.25)";
    ctx.fillRect(x, 0, 2, 128);
  }
  for (let y = 0; y < 128; y += 4) {
    ctx.fillStyle = (y / 4) % 2 ? "rgba(90,60,20,0.3)" : "rgba(255,230,160,0.2)";
    ctx.fillRect(0, y, 256, 2);
  }
  return textureFrom(c);
}

/* ---- Display (the dial panel) ------------------------------------------------------------- */

/**
 * Draw the dial: FM scale with a needle, the station name and the state. Dark when off.
 * @param {HTMLCanvasElement} c
 * @param {"off" | "waiting" | "connecting" | "live" | "error"} state
 * @param {string} title — current track ("" = none)
 */
function drawDisplay(c, state, title) {
  const ctx = c.getContext("2d");
  const w = c.width;
  const h = c.height;
  ctx.fillStyle = "#0a0806";
  ctx.fillRect(0, 0, w, h);
  if (state === "off") {
    // dark glass with a faint reflection
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  // warm backlight
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.6);
  glow.addColorStop(0, "rgba(255,190,90,0.55)");
  glow.addColorStop(1, "rgba(120,60,10,0.25)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // FM scale 88…108
  ctx.strokeStyle = "rgba(40,20,5,0.85)";
  ctx.fillStyle = "rgba(40,20,5,0.9)";
  ctx.font = `${Math.round(h * 0.14)}px serif`;
  ctx.textAlign = "center";
  const left = w * 0.08;
  const right = w * 0.92;
  const scaleY = h * 0.72;
  for (let i = 0; i <= 40; i++) {
    const x = left + ((right - left) * i) / 40;
    const major = i % 5 === 0;
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, scaleY);
    ctx.lineTo(x, scaleY - h * (major ? 0.14 : 0.07));
    ctx.stroke();
    if (major && i % 10 === 0) ctx.fillText(String(88 + i / 2), x, scaleY + h * 0.17);
  }
  ctx.beginPath();
  ctx.moveTo(left, scaleY);
  ctx.lineTo(right, scaleY);
  ctx.stroke();

  // needle
  const needleX = left + (right - left) * 0.12;
  ctx.strokeStyle = "#b3261e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(needleX, h * 0.38);
  ctx.lineTo(needleX, scaleY + h * 0.08);
  ctx.stroke();

  // station and state
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(40,20,5,0.95)";
  ctx.font = `bold ${Math.round(h * 0.26)}px serif`;
  ctx.fillText(RADIO_STATION_NAME, w * 0.08, h * 0.32);
  ctx.textAlign = "right";
  ctx.font = `bold ${Math.round(h * 0.16)}px serif`;
  const label = {
    waiting: t("radio.start"),
    connecting: t("radio.connecting"),
    live: t("radio.live"),
    error: t("radio.nosignal"),
  }[state];
  ctx.fillText(label, w * 0.92, h * 0.32);

  // track title, shortened with an ellipsis if it does not fit
  if (title && state === "live") {
    ctx.textAlign = "left";
    ctx.font = `${Math.round(h * 0.13)}px serif`;
    const maxWidth = (right - left);
    let text = title;
    while (text.length > 1 && ctx.measureText(text).width > maxWidth) text = text.slice(0, -1);
    if (text !== title) text = text.trimEnd() + "…";
    ctx.fillText(text, left, h * 0.5);
  }
}

/* ---- Meshes ------------------------------------------------------------------------------- */

function rounded(width, height, radius) {
  const s = new THREE.Shape();
  const x = -width / 2;
  const y = 0;
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + height - radius);
  s.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  s.lineTo(x + radius, y + height);
  s.quadraticCurveTo(x, y + height, x, y + height - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

/**
 * Build the sideboard with the radio, add it to the scene and return its controls.
 * @param {THREE.Scene} scene
 */
export function createRadio(scene) {
  // Local frame of the whole group: origin on the floor at the wall, +z into the room, +x right
  const root = new THREE.Group();
  root.name = "radio-corner";
  root.position.set(RADIO_WALL_SIDE * (ROOM_WIDTH / 2), 0, RADIO_WALL_Z);
  root.rotation.y = RADIO_WALL_SIDE > 0 ? -Math.PI / 2 : Math.PI / 2;

  const woodMat = new THREE.MeshStandardMaterial({
    color: RADIO_COLOR_WOOD,
    map: woodTexture(2, 1),
    roughness: 0.45,
    metalness: 0.05,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x4a2e1b,
    map: woodTexture(1, 1),
    roughness: 0.5,
  });
  const brass = new THREE.MeshStandardMaterial({ color: RADIO_COLOR_BRASS, roughness: 0.35, metalness: 0.85 });
  const add = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  /* Sideboard */
  const sb = new THREE.Group();
  sb.position.set(0, 0, SIDEBOARD_DEPTH / 2);
  root.add(sb);
  const legH = 0.08;
  const bodyH = SIDEBOARD_HEIGHT - legH - 0.03;
  add(sb, new THREE.BoxGeometry(SIDEBOARD_WIDTH, bodyH, SIDEBOARD_DEPTH), woodMat, 0, legH + bodyH / 2, 0);
  add(sb, new THREE.BoxGeometry(SIDEBOARD_WIDTH + 0.06, 0.03, SIDEBOARD_DEPTH + 0.04), darkWoodMat, 0, SIDEBOARD_HEIGHT - 0.015, 0.01);
  const legGeo = new THREE.CylinderGeometry(0.03, 0.02, legH, 12);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      add(sb, legGeo, darkWoodMat, sx * (SIDEBOARD_WIDTH / 2 - 0.06), legH / 2, sz * (SIDEBOARD_DEPTH / 2 - 0.05));
    }
  }
  // Two doors with brass handles
  const doorW = SIDEBOARD_WIDTH / 2 - 0.05;
  const doorH = bodyH - 0.1;
  for (const sx of [-1, 1]) {
    add(sb, new THREE.BoxGeometry(doorW, doorH, 0.012), darkWoodMat, sx * (doorW / 2 + 0.03), legH + bodyH / 2, SIDEBOARD_DEPTH / 2 + 0.004);
    add(sb, new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12).rotateX(Math.PI / 2), brass, sx * 0.07, legH + bodyH / 2 + 0.05, SIDEBOARD_DEPTH / 2 + 0.024);
  }

  /* Radio on top (its own group: origin = bottom center of the radio, +z = front) */
  const radio = new THREE.Group();
  const topY = SIDEBOARD_HEIGHT;
  radio.position.set(0, topY, SIDEBOARD_DEPTH / 2 - RADIO_DEPTH / 2 + 0.02); // back part on the board
  root.add(radio);
  radio.position.x = 0;
  const feetH = 0.012;
  for (const sx of [-1, 1]) {
    for (const sz of [0.1, 0.9]) {
      add(radio, new THREE.CylinderGeometry(0.014, 0.01, feetH, 10), brass, sx * (RADIO_WIDTH / 2 - 0.04), feetH / 2, RADIO_DEPTH * sz);
    }
  }
  // Body: rounded rectangle extruded into the depth
  const bodyGeo = new THREE.ExtrudeGeometry(rounded(RADIO_WIDTH, RADIO_HEIGHT, 0.03), {
    depth: RADIO_DEPTH - 0.012,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 2,
  });
  const body = add(radio, bodyGeo, woodMat, 0, feetH, 0.006);
  const frontZ = RADIO_DEPTH + 0.002;

  // Speaker cloth in a cream-brass frame (upper part)
  const grilleW = RADIO_WIDTH - 0.07;
  const grilleH = RADIO_HEIGHT * 0.58;
  const grilleY = feetH + RADIO_HEIGHT - 0.03 - grilleH / 2;
  add(radio, new THREE.BoxGeometry(grilleW + 0.016, grilleH + 0.016, 0.006), brass, 0, grilleY, frontZ);
  add(
    radio,
    new THREE.BoxGeometry(grilleW, grilleH, 0.008),
    new THREE.MeshStandardMaterial({ color: RADIO_COLOR_GRILLE, map: grilleTexture(), roughness: 0.9 }),
    0,
    grilleY,
    frontZ + 0.002
  );

  // Dial panel with the display (lower part)
  const dialW = RADIO_WIDTH - 0.07;
  const dialH = RADIO_HEIGHT * 0.27;
  const dialY = feetH + 0.045 + dialH / 2 + 0.02;
  const displayCanvas = canvas(640, 160);
  const displayTexture = textureFrom(displayCanvas);
  const displayMat = new THREE.MeshBasicMaterial({ map: displayTexture });
  add(radio, new THREE.BoxGeometry(dialW + 0.012, dialH + 0.012, 0.005), brass, 0, dialY, frontZ);
  add(radio, new THREE.BoxGeometry(dialW, dialH, 0.006), new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.4 }), 0, dialY, frontZ + 0.002);
  const display = add(radio, new THREE.PlaneGeometry(dialW * 0.62, dialH * 0.8), displayMat, 0, dialY, frontZ + 0.0062);
  display.castShadow = false;

  // Knobs: left decorative, right = power switch
  const knobGeo = new THREE.CylinderGeometry(0.03, 0.033, 0.026, 32).rotateX(Math.PI / 2);
  const knobMat = new THREE.MeshStandardMaterial({ color: RADIO_COLOR_KNOB, roughness: 0.35, metalness: 0.4 });
  const makeKnob = (x) => {
    const g = new THREE.Group();
    g.position.set(x, dialY, frontZ + 0.016);
    g.add(new THREE.Mesh(knobGeo, knobMat));
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.022, 0.004), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    tick.position.set(0, 0.015, 0.014);
    g.add(tick);
    g.children.forEach((m) => (m.castShadow = true));
    radio.add(g);
    return g;
  };
  makeKnob(-(RADIO_WIDTH / 2 - 0.058));
  const powerKnob = makeKnob(RADIO_WIDTH / 2 - 0.058);

  // Power lamp and a row of small keys under the dial
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x103018, emissive: 0x30ff60, emissiveIntensity: 0, roughness: 0.3 });
  add(radio, new THREE.SphereGeometry(0.008, 12, 8), lampMat, dialW / 2 - 0.08, dialY + dialH / 2 - 0.012, frontZ + 0.01);
  for (let i = -2; i <= 2; i++) {
    add(radio, new THREE.BoxGeometry(0.05, 0.014, 0.01), knobMat, i * 0.062, feetH + 0.03, frontZ + 0.004);
  }

  // Warm glow of the lit dial: lights the grille and the sideboard top a little (only when on)
  const dialGlow = new THREE.PointLight(0xffb060, 0, 1.8, 1.6);
  dialGlow.position.set(0, dialY + 0.08, frontZ + 0.12);
  radio.add(dialGlow);

  // Invisible, larger hit area around the power knob
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  powerKnob.add(hit);

  scene.add(root);
  root.updateMatrixWorld(true);

  /* Speakers: left and right of the grille, in world coordinates */
  const speakerWorld = (sx) =>
    radio.localToWorld(new THREE.Vector3(sx * RADIO_SPEAKER_OFFSET_X, RADIO_SPEAKER_HEIGHT, frontZ)).toArray();
  const speakers = { left: speakerWorld(-1), right: speakerWorld(1) };
  const radioPosition = radio.localToWorld(new THREE.Vector3(0, RADIO_HEIGHT / 2, RADIO_DEPTH / 2));

  /* State: switched on by default */
  let state = "waiting";
  let on = true;
  let title = "";
  let knobAngle = 0;
  const redraw = () => {
    drawDisplay(displayCanvas, state, title);
    displayTexture.needsUpdate = true;
    lampMat.emissiveIntensity = state === "off" ? 0 : 1.2;
    dialGlow.intensity = state === "off" ? 0 : 0.6;
  };
  const audio = new RadioAudio(RADIO_STREAM_URL, speakers, (s) => {
    state = s;
    if (s === "live") metadata.start();
    else {
      metadata.stop();
      title = "";
    }
    redraw();
  });
  const metadata = new RadioMetadata(RADIO_STREAM_URL, (text) => {
    title = text;
    redraw();
  });
  redraw();
  onLanguageChange(redraw);

  // The first click/key anywhere allows sound (browser autoplay policy)
  const unlock = () => audio.unlock();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  audio.setOn(true);

  const raycaster = new THREE.Raycaster();
  return {
    group: root,
    isOn: () => on,
    /** Current state (for the UI/tests): on/off, display state, spatial audio active. */
    info: () => ({
      on,
      state,
      title,
      spatial: audio.spatial,
      speakers,
      knob: powerKnob.getWorldPosition(new THREE.Vector3()).toArray(),
    }),
    /**
     * Click test: toggles the radio if the ray hits the power knob close enough.
     * @param {THREE.Camera} camera
     * @param {{ x: number, y: number }} ndc — pointer in normalized device coordinates
     * @returns {boolean} true if the knob was hit
     */
    handleClick(camera, ndc) {
      raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
      raycaster.far = RADIO_CLICK_DISTANCE;
      if (raycaster.intersectObject(hit, false).length === 0) return false;
      on = !on;
      audio.unlock(); // a click is a user gesture
      audio.setOn(on);
      return true;
    },
    /** Per frame: audio listener = camera, and the knob turns smoothly. */
    update(dt, camera) {
      audio.update(camera, radioPosition);
      const target = on ? 0 : -Math.PI / 2;
      knobAngle += (target - knobAngle) * Math.min(1, dt * 12);
      powerKnob.rotation.z = knobAngle;
    },
  };
}
