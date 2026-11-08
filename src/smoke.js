/**
 * Smoke: a tall thin plane that always turns towards the camera (around the vertical axis) with a
 * shader that draws a drifting, swaying wisp from layered noise: thin at the bottom, wider and
 * fainter towards the top. Used for the thread rising from a glowing cigarette.
 * See _docs/cigarettes.md.
 */
import * as THREE from "three";
import { NOISE } from "./noise-glsl.js";
import { SMOKE_LIGHT_GLSL, smokeLightUniforms } from "./smoke-light.js";

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  ${NOISE}
  void main() {
    vUv = uv;
    vec3 p = position;
    float h = uv.y;
    // the wisp sways more and more the higher it rises, and widens
    float sway = ( vnoise( vec2( h * 2.5 - uTime * 0.35, uSeed ) ) - 0.5 ) * 2.0;
    p.x += sway * 1.1 * h * h;
    p.x *= mix( 0.5, 3.0, h );
    vWorld = ( modelMatrix * vec4( p, 1.0 ) ).xyz;
    vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  ${NOISE}
  ${SMOKE_LIGHT_GLSL}
  void main() {
    float h = vUv.y;
    vec2 q = vec2( vUv.x * 1.5 + uSeed, h * 3.0 - uTime * 0.5 );
    float warp = vnoise( q * 2.0 + vec2( 0.0, uTime * 0.2 ) );
    q.x += ( warp - 0.5 ) * 1.2; // domain warping: the wisp curls
    float n = fbm( q * 2.0 + 7.0 );
    float across = pow( 1.0 - smoothstep( 0.0, 0.5, abs( vUv.x - 0.5 ) ), 1.6 );
    float wisp = smoothstep( 0.32, 0.72, n );
    float fadeIn = smoothstep( 0.0, 0.08, h );
    float fadeOut = 1.0 - smoothstep( 0.4, 1.0, h );
    float alpha = across * wisp * fadeIn * fadeOut * uOpacity;
    if ( alpha < 0.003 ) discard; // nothing to see here: skip the lighting
    gl_FragColor = vec4( uColor * smokeLight( vWorld ), alpha );
    #include <fog_fragment>
  }
`;

/**
 * @param {{ width: number, height: number, opacity: number, color: number, seed: number }} o
 * @returns {THREE.Mesh} origin at the bottom centre; call `faceCamera` and `smokeTime` each frame
 */
export function createSmokeColumn({ width, height, opacity, color, seed }) {
  const geo = new THREE.PlaneGeometry(1, 1, 1, 1).translate(0, 0.5, 0);
  const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uTime: { value: 0 }, uSeed: { value: seed }, uOpacity: { value: opacity }, uColor: { value: new THREE.Color(color) } },
  ]);
  uniforms.uCandles = smokeLightUniforms.uCandles; // shared, not cloned
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.set(width, height, 1);
  mesh.renderOrder = 3;
  mesh.frustumCulled = false; // the shader moves the vertices
  return mesh;
}

/** Turn the column around the vertical axis so its face looks at the camera. */
export function faceCamera(mesh, camera) {
  mesh.rotation.y = Math.atan2(camera.position.x - mesh.position.x, camera.position.z - mesh.position.z);
}
