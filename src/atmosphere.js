/**
 * Atmosphere: ground fog and ceiling fog drift through the room as stacked see-through layers
 * (moving noise shader), and the ceiling lamps show light shafts that are brighter where the
 * air is hazy. Parameters: room-constants.js. See _docs/look.md.
 */
import * as THREE from "three";
import { NOISE } from "./noise-glsl.js";
import { SMOKE_LIGHT_GLSL, smokeLightUniforms } from "./smoke-light.js";
import {
  ROOM_LENGTH,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  LAMP_COUNT,
  LAMP_HEIGHT,
  LAMP_SPACING,
  LAMP_SHADE_RADIUS,
  LAMP_LIGHT_COLOR,
  GROUND_FOG_LAYERS,
  GROUND_FOG_TOP,
  GROUND_FOG_OPACITY,
  GROUND_FOG_COLOR,
  CEILING_FOG_LAYERS,
  CEILING_FOG_BOTTOM,
  CEILING_FOG_OPACITY,
  CEILING_FOG_COLOR,
  FOG_WISP_SCALE,
  FOG_DRIFT_SPEED,
  SHAFT_ANGLE,
  SHAFT_INTENSITY,
} from "./room-constants.js";

const LAYER_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4( vWorld, 1.0 );
  }
`;

const LAYER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uScale;
  uniform vec2 uDrift;
  uniform float uSeed;
  uniform vec3 uColor;
  varying vec3 vWorld;
  ${NOISE}
  ${SMOKE_LIGHT_GLSL}
  void main() {
    vec2 p = vWorld.xz * uScale + uDrift * uTime + uSeed;
    p += 1.4 * vec2( vnoise( p * 0.7 + uTime * 0.02 ), vnoise( p * 0.7 + 5.0 ) ); // swirl the wisps
    float wisps = smoothstep( 0.36, 0.78, fbm( p ) );
    float d = distance( cameraPosition, vWorld );
    float fade = smoothstep( 0.5, 2.5, d ) * ( 1.0 - smoothstep( 12.0, 24.0, d ) ); // no hard edge close by or far away
    float alpha = wisps * fade * uOpacity;
    if ( alpha < 0.002 ) discard; // nothing to see here: skip the lighting
    gl_FragColor = vec4( uColor * smokeLight( vWorld ), alpha );
  }
`;

const SHAFT_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  void main() {
    vWorld = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
    vNormalW = normalize( mat3( modelMatrix ) * normal );
    gl_Position = projectionMatrix * viewMatrix * vec4( vWorld, 1.0 );
  }
`;

const SHAFT_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uApexY;
  uniform float uHeight;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  ${NOISE}
  void main() {
    vec3 view = normalize( cameraPosition - vWorld );
    float across = pow( abs( dot( normalize( vNormalW ), view ) ), 1.3 ); // soft edges: strongest through the middle
    float t = ( uApexY - vWorld.y ) / uHeight; // 0 at the lamp, 1 at the floor
    float along = smoothstep( 0.0, 0.05, t ) * pow( max( 0.0, 1.0 - t ), 1.4 );
    // haze: the shaft is brighter where the air is thick, and it drifts
    float haze = 0.25 + 1.1 * smoothstep( 0.3, 0.75, fbm( vec2( vWorld.x * 1.1 + vWorld.y * 0.6, vWorld.z * 1.1 - uTime * 0.12 ) ) );
    gl_FragColor = vec4( uColor * uIntensity * across * along * haze, 1.0 );
  }
`;

/** A flat layer of drifting fog filling the room at height `y`. */
function fogLayer(y, color, opacity, seed, drift) {
  const geo = new THREE.PlaneGeometry(ROOM_WIDTH - 0.04, ROOM_LENGTH - 0.04).rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uScale: { value: FOG_WISP_SCALE },
      uDrift: { value: new THREE.Vector2(drift[0], drift[1]) },
      uSeed: { value: seed },
      uColor: { value: new THREE.Color(color) },
      uCandles: smokeLightUniforms.uCandles,
    },
    vertexShader: LAYER_VERTEX,
    fragmentShader: LAYER_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = y;
  mesh.renderOrder = 4;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * @param {THREE.Scene} scene
 * @returns {{ group: THREE.Group, update: (dt: number) => void }}
 */
export function createAtmosphere(scene) {
  const group = new THREE.Group();
  group.name = "atmosphere";
  const materials = [];
  const add = (mesh) => {
    group.add(mesh);
    materials.push(mesh.material);
  };

  // Ground fog: layers between 0.05 m and GROUND_FOG_TOP, each drifting its own way
  for (let i = 0; i < GROUND_FOG_LAYERS; i++) {
    const y = 0.05 + ((GROUND_FOG_TOP - 0.05) * i) / Math.max(1, GROUND_FOG_LAYERS - 1);
    const a = i * 2.4;
    add(fogLayer(y, GROUND_FOG_COLOR, GROUND_FOG_OPACITY / Math.sqrt(GROUND_FOG_LAYERS), i * 7.3, [Math.cos(a) * FOG_DRIFT_SPEED, Math.sin(a) * FOG_DRIFT_SPEED]));
  }
  // Ceiling fog: layers below the ceiling
  for (let i = 0; i < CEILING_FOG_LAYERS; i++) {
    const y = CEILING_FOG_BOTTOM + ((ROOM_HEIGHT - 0.1 - CEILING_FOG_BOTTOM) * i) / Math.max(1, CEILING_FOG_LAYERS - 1);
    const a = 1 + i * 2.1;
    add(fogLayer(y, CEILING_FOG_COLOR, CEILING_FOG_OPACITY / Math.sqrt(CEILING_FOG_LAYERS), 40 + i * 5.1, [Math.cos(a) * FOG_DRIFT_SPEED * 1.4, Math.sin(a) * FOG_DRIFT_SPEED * 1.4]));
  }

  // Light shafts: one cone per ceiling lamp, from the lamp down to the floor
  // the shaft leaves the opening of the shade (its rim) and widens towards the floor
  const apexY = LAMP_HEIGHT;
  const shaftGeo = new THREE.CylinderGeometry(LAMP_SHADE_RADIUS, LAMP_SHADE_RADIUS + Math.tan(SHAFT_ANGLE) * apexY, apexY, 48, 1, true);
  for (let i = 0; i < LAMP_COUNT; i++) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uApexY: { value: apexY },
        uHeight: { value: apexY },
        uIntensity: { value: SHAFT_INTENSITY },
        uColor: { value: new THREE.Color(LAMP_LIGHT_COLOR) },
      },
      vertexShader: SHAFT_VERTEX,
      fragmentShader: SHAFT_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const shaft = new THREE.Mesh(shaftGeo, material);
    shaft.position.set(0, apexY / 2, (i - (LAMP_COUNT - 1) / 2) * LAMP_SPACING);
    shaft.renderOrder = 4;
    shaft.frustumCulled = false;
    add(shaft);
  }

  scene.add(group);
  let time = 0;
  return {
    group,
    update(dt) {
      time += dt;
      for (const m of materials) m.uniforms.uTime.value = time;
    },
  };
}
