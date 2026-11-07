/**
 * Reflections of the room in the balls. The room is captured once as a cube map (from the table
 * center at ball height, before the balls and the cue exist) and used only by the ball materials,
 * so the lighting of the scene stays as it is. See _docs/look.md.
 */
import * as THREE from "three";
import { REFLECTION_LAYER } from "./ceiling-lamps.js";
import { TABLE_H } from "./table-constants.js";
import {
  ROOM_WIDTH,
  ROOM_LENGTH,
  LAMP_HEIGHT,
  LAMP_SHADE_HEIGHT,
  BALL_REFLECTION_SIZE,
  BALL_REFLECTION_INTENSITY,
} from "./room-constants.js";

/**
 * Parallax proxy: reflections are looked up as if the captured room were a box around the table:
 * walls at the real walls, floor at the cloth, ceiling at the lamps (so the lamps land where they
 * really hang for every ball, however far from the capture point).
 */
const PROXY_MIN = [-ROOM_WIDTH / 2, TABLE_H, -ROOM_LENGTH / 2];
const PROXY_MAX = [ROOM_WIDTH / 2, LAMP_HEIGHT + LAMP_SHADE_HEIGHT / 2, ROOM_LENGTH / 2];

/**
 * Capture the room as an HDR cube map.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @returns {{ texture: THREE.Texture, center: THREE.Vector3 }}
 */
export function captureRoomReflection(renderer, scene) {
  const center = new THREE.Vector3(0, TABLE_H + 0.03, 0);
  const target = new THREE.WebGLCubeRenderTarget(BALL_REFLECTION_SIZE, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(0.05, 50, target);
  cubeCamera.position.copy(center);
  cubeCamera.layers.enable(REFLECTION_LAYER);
  cubeCamera.children.forEach((c) => c.layers.enable(REFLECTION_LAYER));
  scene.updateMatrixWorld(true);
  cubeCamera.update(renderer, scene);
  return { texture: target.texture, center };
}

const vec3 = (a) => `vec3(${a.map((v) => v.toFixed(4)).join(", ")})`;

/**
 * Let a physical material reflect the captured room: parallax-corrected lookup, specular only
 * (the environment adds no diffuse light, so the balls do not get brighter).
 * @param {THREE.MeshPhysicalMaterial} material
 * @param {{ texture: THREE.Texture, center: THREE.Vector3 }} reflection
 */
export function applyBallReflection(material, reflection) {
  material.envMap = reflection.texture;
  material.envMapIntensity = BALL_REFLECTION_INTENSITY;
  material.customProgramCacheKey = () => "ball-reflection";
  material.needsUpdate = true; // recompile if the material was already used
  material.onBeforeCompile = (shader) => {
    const proxy = `
      vec3 proxyBoxDirection( vec3 dir ) {
        vec3 pos = ( inverse( viewMatrix ) * vec4( - vViewPosition, 1.0 ) ).xyz;
        vec3 t1 = ( ${vec3(PROXY_MAX)} - pos ) / dir;
        vec3 t2 = ( ${vec3(PROXY_MIN)} - pos ) / dir;
        vec3 tFar = max( t1, t2 );
        float t = min( min( tFar.x, tFar.y ), tFar.z );
        return pos + dir * t - ${vec3(reflection.center.toArray())};
      }
    `;
    const radianceChunk = THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
      "reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );",
      "reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );\n reflectVec = proxyBoxDirection( reflectVec );"
    );
    const mapsChunk = THREE.ShaderChunk.lights_fragment_maps.replace(
      "iblIrradiance += getIBLIrradiance( geometryNormal );",
      "// no diffuse light from the reflection map"
    );
    if (radianceChunk === THREE.ShaderChunk.envmap_physical_pars_fragment || mapsChunk === THREE.ShaderChunk.lights_fragment_maps) {
      console.warn("[Backroom Billard] ball reflection: shader chunks changed, reflection patch not applied");
      return;
    }
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <envmap_physical_pars_fragment>", proxy + radianceChunk)
      .replace("#include <lights_fragment_maps>", mapsChunk);
  };
}
