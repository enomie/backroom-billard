/**
 * The old double swing door of wood and amber glass in the short wall behind the player, with its
 * reveal and trim: a dummy that does not open. A glowing plate at the back of the reveal stands in
 * for the light behind the glass. See door-constants.js and _docs/look.md.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ROOM_LENGTH } from "./room-constants.js";
import * as C from "./door-constants.js";

const { DOOR_OPENING_WIDTH: OW, DOOR_OPENING_HEIGHT: OH, DOOR_WALL_DEPTH: DEPTH, DOOR_GAP: GAP } = C;
const T = C.DOOR_LEAF_THICKNESS;

/**
 * A wall plane (x along the wall, y up, facing +z) with the door opening cut out of its foot.
 * UVs run 0…1 along the wall and up.
 * @param {number} width
 * @param {number} height
 */
export function wallWithDoorGeometry(width, height) {
  const w = width / 2;
  const o = OW / 2;
  const outline = [[-w, 0], [-o, 0], [-o, OH], [o, OH], [o, 0], [w, 0], [w, height], [-w, height]];
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))));
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, (position.getX(i) + w) / width, position.getY(i) / height);
  return geometry;
}

function canvasTexture(width, height, draw, repeat = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Brown paint, worn down to the bare wood at the edges, scratched and speckled. */
function doorWoodTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = C.DOOR_COLOR_PAINT;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "20,10,4" : "130,90,55"}, ${0.05 + Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 14);
    }
    for (let i = 0; i < 40; i++) {
      // worn patches: bare wood shows through the paint
      ctx.fillStyle = `rgba(${C.DOOR_COLOR_BARE_WOOD.slice(1).match(/../g).map((v) => parseInt(v, 16)).join(",")}, ${0.15 + Math.random() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 14, 2 + Math.random() * 6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(200,170,130,${0.1 + Math.random() * 0.25})`;
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50);
      ctx.stroke();
    }
  });
}

/** Amber glass: wavy streaks of lighter and darker tint (repeats seamlessly). */
function glassColorTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = C.DOOR_GLASS_COLOR_BASE;
    ctx.fillRect(0, 0, w, h);
    for (let band = 0; band < 10; band++) {
      const y = (band / 10) * h + Math.random() * 4;
      const phase = Math.random() * Math.PI * 2;
      ctx.strokeStyle = Math.random() < 0.5 ? C.DOOR_GLASS_COLOR_LIGHT : C.DOOR_GLASS_COLOR_DARK;
      ctx.globalAlpha = 0.45 + Math.random() * 0.4;
      ctx.lineWidth = 4 + Math.random() * 9;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const yy = y + Math.sin((x / w) * Math.PI * 2 * 2 + phase) * 6;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, true);
}

/** Normal map of old rolled glass: soft, slanting waves (periodic, so it repeats without a seam). */
function glassNormalTexture() {
  const size = 128;
  const height = (x, y) => {
    const u = (x / size) * Math.PI * 2;
    const v = (y / size) * Math.PI * 2;
    return Math.sin(3 * v + 0.9 * Math.sin(2 * u + v)) + 0.5 * Math.sin(5 * v - 2 * u) + 0.3 * Math.sin(2 * u + 7 * v);
  };
  const texture = canvasTexture(size, size, (ctx) => {
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = height(x + 1, y) - height(x - 1, y);
        const dy = height(x, y + 1) - height(x, y - 1);
        const n = new THREE.Vector3(-dx * 0.5, -dy * 0.5, 1).normalize();
        const i = (y * size + x) * 4;
        image.data[i] = (n.x * 0.5 + 0.5) * 255;
        image.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
        image.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, true);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

/** A golden "B" painted on the glass; `mirrored` flips it left to right. */
function logoTexture(mirrored) {
  return canvasTexture(256, 320, (ctx, w, h) => {
    ctx.translate(mirrored ? w : 0, 0);
    ctx.scale(mirrored ? -1 : 1, 1);
    ctx.font = "bold 280px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const gradient = ctx.createLinearGradient(0, 20, 0, h - 20);
    gradient.addColorStop(0, C.DOOR_LOGO_COLOR_LIGHT);
    gradient.addColorStop(0.45, C.DOOR_LOGO_COLOR_MID);
    gradient.addColorStop(1, C.DOOR_LOGO_COLOR_DARK);
    ctx.lineJoin = "round";
    ctx.lineWidth = 10;
    ctx.strokeStyle = C.DOOR_LOGO_COLOR_DARK;
    ctx.strokeText("B", w / 2, h / 2 + 12);
    ctx.fillStyle = gradient;
    ctx.fillText("B", w / 2, h / 2 + 12);
  });
}

/** A box as a geometry placed at (x, y, z) — for merging. */
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/** A rod between two points. */
function rod(a, b, radius) {
  const direction = b.clone().sub(a);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 10);
  const matrix = new THREE.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    new THREE.Vector3(1, 1, 1)
  );
  return geometry.applyMatrix4(matrix);
}

/** @param {THREE.Scene} scene */
export function createDoor(scene) {
  const group = new THREE.Group();
  group.name = "door";
  // origin on the wall surface, +z into the room (like the walls); the reveal reaches to −z
  group.position.set(0, 0, ROOM_LENGTH / 2);
  group.rotation.y = Math.PI;

  const woodMap = doorWoodTexture();
  // the paint glows faintly, the room is dark
  const wood = new THREE.MeshStandardMaterial({
    map: woodMap,
    roughness: 0.85,
    emissive: 0xffffff,
    emissiveMap: woodMap,
    emissiveIntensity: C.DOOR_WOOD_GLOW,
  });
  const iron = new THREE.MeshStandardMaterial({ color: C.DOOR_COLOR_IRON, roughness: 0.5, metalness: 0.7 });
  const bronze = new THREE.MeshStandardMaterial({ color: C.DOOR_COLOR_BRONZE, roughness: 0.45, metalness: 0.5, emissive: C.DOOR_COLOR_BRONZE, emissiveIntensity: 0.15 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    map: glassColorTexture(),
    normalMap: glassNormalTexture(),
    normalScale: new THREE.Vector2(C.DOOR_GLASS_WAVE_STRENGTH, C.DOOR_GLASS_WAVE_STRENGTH),
    transparent: true,
    opacity: C.DOOR_GLASS_OPACITY,
    roughness: 0.12,
    emissive: C.DOOR_GLASS_GLOW,
    emissiveIntensity: C.DOOR_GLASS_GLOW_INTENSITY,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const add = (geometry, material, parent = group) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // --- reveal (the wall's thickness around the opening) and sill
  const reveal = [
    new THREE.PlaneGeometry(DEPTH, OH).rotateY(Math.PI / 2).translate(-OW / 2, OH / 2, -DEPTH / 2),
    new THREE.PlaneGeometry(DEPTH, OH).rotateY(-Math.PI / 2).translate(OW / 2, OH / 2, -DEPTH / 2),
    new THREE.PlaneGeometry(OW, DEPTH).rotateX(Math.PI / 2).translate(0, OH, -DEPTH / 2),
    box(OW, C.DOOR_SILL_HEIGHT, DEPTH, 0, C.DOOR_SILL_HEIGHT / 2, -DEPTH / 2),
  ];
  add(mergeGeometries(reveal.map((g) => g.toNonIndexed())), wood);
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(OW, OH), new THREE.MeshBasicMaterial({ color: C.DOOR_BACKDROP_COLOR, fog: false }));
  backdrop.position.set(0, OH / 2, -DEPTH);
  group.add(backdrop);

  // --- trim around the opening on the room side
  const cw = C.DOOR_CASING_WIDTH;
  const cd = C.DOOR_CASING_DEPTH;
  add(
    mergeGeometries([
      box(cw, OH + cw, cd, -(OW / 2 + cw / 2), (OH + cw) / 2, cd / 2),
      box(cw, OH + cw, cd, OW / 2 + cw / 2, (OH + cw) / 2, cd / 2),
      box(OW + 2 * cw, cw, cd, 0, OH + cw / 2, cd / 2),
      box(OW + 2 * cw + 0.06, 0.035, cd + 0.015, 0, OH + cw + 0.0175, (cd + 0.015) / 2), // cornice
    ].map((g) => g.toNonIndexed())),
    wood
  );

  // --- the two leaves, hanging in the middle of the reveal
  const leaves = new THREE.Group();
  leaves.position.z = -DEPTH / 2;
  group.add(leaves);
  const leafWidth = (OW - 3 * GAP) / 2;
  const bottom = C.DOOR_SILL_HEIGHT + GAP;
  const top = OH - GAP;
  const panelHeight = top - bottom - C.DOOR_TOP_RAIL - C.DOOR_GLASS_HEIGHT - C.DOOR_MID_RAIL - C.DOOR_BOTTOM_RAIL;
  const inner = leafWidth - 2 * C.DOOR_STILE;
  const paneWidth = (inner - 2 * C.DOOR_MUNTIN) / 3;
  const paneHeight = (C.DOOR_GLASS_HEIGHT - 2 * C.DOOR_MUNTIN) / 3;
  const glassTop = top - C.DOOR_TOP_RAIL;
  const midY = glassTop - C.DOOR_GLASS_HEIGHT - C.DOOR_MID_RAIL / 2;
  const panelWidth = (inner - C.DOOR_PANEL_STILE) / 2;
  const panelY = bottom + C.DOOR_BOTTOM_RAIL + panelHeight / 2;
  const logos = [logoTexture(true), logoTexture(false)]; // left leaf: mirrored B, right leaf: normal B

  /**
   * One leaf. `dir` is +1 for the left leaf (hinged at the left edge of the opening, extends to the
   * right) and −1 for the right one; `u` is the distance from the hinge edge.
   */
  const buildLeaf = (dir, logo) => {
    const hingeX = dir * (-OW / 2 + GAP);
    const x = (u, w = 0) => hingeX + dir * (u + w / 2); // center of a part from u to u + w
    const frame = [];
    const parts = (w, h, d, u, y, z = 0) => frame.push(box(w, h, d, x(u, w), y, z));
    const full = top - bottom;
    parts(C.DOOR_STILE, full, T, 0, (top + bottom) / 2); // hinge stile
    parts(C.DOOR_STILE, full, T, leafWidth - C.DOOR_STILE, (top + bottom) / 2); // free stile
    parts(inner, C.DOOR_TOP_RAIL, T, C.DOOR_STILE, top - C.DOOR_TOP_RAIL / 2);
    parts(inner, C.DOOR_MID_RAIL, T, C.DOOR_STILE, midY);
    parts(inner, C.DOOR_BOTTOM_RAIL, T, C.DOOR_STILE, bottom + C.DOOR_BOTTOM_RAIL / 2);
    parts(C.DOOR_PANEL_STILE, panelHeight, T, C.DOOR_STILE + panelWidth, panelY); // between the panels
    for (let i = 1; i <= 2; i++) {
      // muntins between the panes
      const u = C.DOOR_STILE + i * paneWidth + (i - 1) * C.DOOR_MUNTIN;
      parts(C.DOOR_MUNTIN, C.DOOR_GLASS_HEIGHT, C.DOOR_MUNTIN_DEPTH, u, glassTop - C.DOOR_GLASS_HEIGHT / 2);
      const y = glassTop - i * paneHeight - (i - 0.5) * C.DOOR_MUNTIN;
      parts(inner, C.DOOR_MUNTIN, C.DOOR_MUNTIN_DEPTH, C.DOOR_STILE, y);
    }
    for (let i = 0; i < 2; i++) {
      // the raised panels
      const u = C.DOOR_STILE + i * (panelWidth + C.DOOR_PANEL_STILE);
      parts(panelWidth, panelHeight, C.DOOR_PANEL_THICKNESS, u, panelY);
      parts(panelWidth - 0.07, panelHeight - 0.07, C.DOOR_PANEL_THICKNESS + 0.014, u + 0.035, panelY);
    }
    add(mergeGeometries(frame.map((g) => g.toNonIndexed())), wood, leaves);

    // glass: 3 × 3 panes, each with its own offset into the wave texture
    const panes = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const pane = new THREE.PlaneGeometry(paneWidth, paneHeight);
        const u = C.DOOR_STILE + col * (paneWidth + C.DOOR_MUNTIN) + paneWidth / 2;
        const y = glassTop - row * (paneHeight + C.DOOR_MUNTIN) - paneHeight / 2;
        pane.translate(x(u), y, 0);
        const uv = pane.attributes.uv;
        const [ox, oy] = [Math.random(), Math.random()];
        for (let i = 0; i < uv.count; i++) uv.setXY(i, ox + uv.getX(i) * 0.9, oy + uv.getY(i) * 1.4);
        panes.push(pane);
      }
    }
    add(mergeGeometries(panes), glassMaterial, leaves).renderOrder = 2;

    // the gilded letter on one pane, painted on the room side of the glass
    const logoU = C.DOOR_STILE + C.DOOR_LOGO_COLUMN * (paneWidth + C.DOOR_MUNTIN) + paneWidth / 2;
    const logoY = glassTop - C.DOOR_LOGO_ROW * (paneHeight + C.DOOR_MUNTIN) - paneHeight / 2;
    const logoWidth = paneWidth * C.DOOR_LOGO_SIZE;
    const letter = new THREE.Mesh(
      new THREE.PlaneGeometry(logoWidth, logoWidth * 1.25),
      new THREE.MeshStandardMaterial({
        map: logo,
        transparent: true,
        alphaTest: 0.05,
        roughness: 0.3,
        metalness: 0.5,
        emissive: 0xffffff,
        emissiveMap: logo,
        emissiveIntensity: 0.25,
        depthWrite: false,
      })
    );
    letter.position.set(x(logoU), logoY, 0.004);
    letter.renderOrder = 3;
    leaves.add(letter);

    // slanted push bar on the room side: the top end at the free edge, the lower end towards the hinge
    const barZ = T / 2 + C.DOOR_BAR_STANDOFF;
    const topEnd = new THREE.Vector3(x(leafWidth - C.DOOR_STILE - 0.05), glassTop - C.DOOR_GLASS_HEIGHT + 0.12, barZ);
    const lowEnd = new THREE.Vector3(topEnd.x - dir * C.DOOR_BAR_RUN, topEnd.y - C.DOOR_BAR_RISE, barZ);
    const metal = [rod(lowEnd, topEnd, C.DOOR_BAR_RADIUS)];
    for (const end of [lowEnd, topEnd]) metal.push(rod(end, end.clone().setZ(T / 2), C.DOOR_BAR_RADIUS * 0.8));
    add(mergeGeometries(metal.map((g) => g.toNonIndexed())), bronze, leaves);

    // strap hinges at the hinge edge
    const straps = [];
    for (let i = 0; i < C.DOOR_HINGES; i++) {
      const y = THREE.MathUtils.lerp(top - 0.25, bottom + 0.3, i / (C.DOOR_HINGES - 1));
      straps.push(box(C.DOOR_HINGE_PLATE, 0.045, 0.006, x(0, C.DOOR_HINGE_PLATE), y, T / 2 + 0.003));
      straps.push(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 10).translate(hingeX, y, 0));
    }
    add(mergeGeometries(straps.map((g) => g.toNonIndexed())), iron, leaves);
  };
  buildLeaf(1, logos[0]);
  buildLeaf(-1, logos[1]);

  scene.add(group);
  return { group };
}
