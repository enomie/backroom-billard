/**
 * The exhaled cloud: a burst of soft smoke puffs that leave the player's mouth in the viewing
 * direction, slow down, grow, drift upwards a little and dissolve. Each puff is a camera-facing
 * quad with a noise shader (ragged, cloudy edge). Triggered with the T key for now.
 * See _docs/cigarettes.md.
 */
import * as THREE from "three";
import { NOISE } from "./noise-glsl.js";
import {
  EXHALE_PUFFS,
  EXHALE_POOL,
  EXHALE_SECONDS,
  EXHALE_SPEED,
  EXHALE_SPREAD,
  EXHALE_DRAG,
  EXHALE_RISE,
  EXHALE_SIZE_START,
  EXHALE_SIZE_END,
  EXHALE_LIFE_MIN,
  EXHALE_LIFE_MAX,
  EXHALE_OPACITY,
  EXHALE_COLOR,
  EXHALE_MOUTH_FORWARD,
  EXHALE_MOUTH_DOWN,
} from "./cigarette-constants.js";

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vWorld = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4( vWorld, 1.0 );
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${NOISE}
  void main() {
    vec2 p = ( vUv - 0.5 ) * 2.0;
    float n = fbm( p * 1.6 + uSeed + vec2( uTime * 0.08, -uTime * 0.05 ) );
    float n2 = fbm( p * 3.0 - uSeed * 0.7 + n * 1.5 + uTime * 0.1 );
    float edge = 1.0 - smoothstep( 0.2, 0.95, length( p ) + ( n - 0.5 ) * 1.1 ); // ragged outline
    float body = mix( 0.55, 1.0, smoothstep( 0.2, 0.8, n2 ) );
    float near = smoothstep( 0.08, 0.4, distance( cameraPosition, vWorld ) ); // not a wall right in front of the eyes
    vec3 color = uColor * mix( 0.75, 1.0, vUv.y ); // a little darker at the bottom
    gl_FragColor = vec4( color, edge * body * near * uOpacity );
  }
`;

/**
 * @param {THREE.Scene} scene
 * @returns {{ group: THREE.Group, trigger: (camera: THREE.Camera) => void,
 *            update: (dt: number, camera: THREE.Camera) => void }}
 */
export function createExhale(scene) {
  const group = new THREE.Group();
  group.name = "exhale";
  const geo = new THREE.PlaneGeometry(1, 1);

  const puffs = Array.from({ length: EXHALE_POOL }, () => {
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSeed: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(EXHALE_COLOR) } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    group.add(mesh);
    return { mesh, active: false, age: 0, life: 1, velocity: new THREE.Vector3() };
  });
  scene.add(group);

  /** Breaths in progress: the camera pose at the start and how many puffs are still to come. */
  const breaths = [];
  let time = 0;
  const forward = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  function spawn(origin, dir) {
    const puff = puffs.find((p) => !p.active);
    if (!puff) return;
    const jitter = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2 * EXHALE_SPREAD);
    puff.velocity.copy(dir).add(jitter).normalize().multiplyScalar(EXHALE_SPEED * (0.7 + 0.6 * Math.random()));
    puff.mesh.position.copy(origin).addScaledVector(dir, Math.random() * 0.05);
    puff.age = 0;
    puff.life = EXHALE_LIFE_MIN + Math.random() * (EXHALE_LIFE_MAX - EXHALE_LIFE_MIN);
    puff.mesh.material.uniforms.uSeed.value = Math.random() * 40;
    puff.active = true;
    puff.mesh.visible = true;
  }

  return {
    group,
    /** Exhale from the player's mouth: just in front of and below the camera, along its view. */
    trigger(camera) {
      camera.getWorldDirection(forward);
      const origin = camera.position.clone().addScaledVector(forward, EXHALE_MOUTH_FORWARD).addScaledVector(up, -EXHALE_MOUTH_DOWN);
      breaths.push({ origin, dir: forward.clone(), age: 0, spawned: 0 });
    },
    update(dt, camera) {
      time += dt;
      for (let i = breaths.length - 1; i >= 0; i--) {
        const b = breaths[i];
        b.age += dt;
        const due = Math.min(EXHALE_PUFFS, Math.floor((b.age / EXHALE_SECONDS) * EXHALE_PUFFS) + 1);
        while (b.spawned < due) {
          spawn(b.origin, b.dir);
          b.spawned++;
        }
        if (b.spawned >= EXHALE_PUFFS) breaths.splice(i, 1);
      }
      for (const p of puffs) {
        if (!p.active) continue;
        p.age += dt;
        const k = p.age / p.life;
        if (k >= 1) {
          p.active = false;
          p.mesh.visible = false;
          continue;
        }
        p.velocity.multiplyScalar(Math.exp(-EXHALE_DRAG * dt));
        p.velocity.y += EXHALE_RISE * dt;
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.mesh.quaternion.copy(camera.quaternion);
        p.mesh.scale.setScalar(THREE.MathUtils.lerp(EXHALE_SIZE_START, EXHALE_SIZE_END, Math.sqrt(k)));
        const u = p.mesh.material.uniforms;
        u.uTime.value = time;
        u.uOpacity.value = EXHALE_OPACITY * THREE.MathUtils.smoothstep(k, 0, 0.08) * (1 - THREE.MathUtils.smoothstep(k, 0.45, 1));
      }
    },
  };
}
