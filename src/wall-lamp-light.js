/**
 * The light of the ten wall lamps (position, cone, falloff: room-constants.js), added to the
 * materials it can reach instead of ten three.js spot lights. Three computes every light for every
 * pixel of every material, even where it cannot arrive; the wall lamps shine straight down and
 * only reach the wall below them, the floor beside the wall and what stands right there. So only
 * those materials (walls, paneling, carpet, the lamps themselves, the radio, the chairs at the wall)
 * run this loop, and it skips a lamp with two cheap tests. The result is the same as with spot
 * lights: same cone, same softness, same falloff, same lighting model (RE_Direct).
 */
import * as THREE from "three";
import { wallLampLightPositions } from "./wall-lamp-places.js";
import {
  WALL_LAMP_LIGHT_COLOR,
  WALL_LAMP_LIGHT_INTENSITY,
  WALL_LAMP_LIGHT_ANGLE,
  WALL_LAMP_LIGHT_PENUMBRA,
  WALL_LAMP_LIGHT_DECAY,
  WALL_LAMP_LIGHT_DISTANCE,
} from "./room-constants.js";

const float = (v) => v.toFixed(6);
let snippet = null;

/** The GLSL that adds the lamps' light before the image-based light is applied. */
function lampLightGlsl() {
  const positions = wallLampLightPositions();
  const color = new THREE.Color(WALL_LAMP_LIGHT_COLOR).multiplyScalar(WALL_LAMP_LIGHT_INTENSITY);
  return `
#if defined( RE_Direct )
{
	const vec3 WALL_LAMP_POSITIONS[ ${positions.length} ] = vec3[ ${positions.length} ](
		${positions.map((p) => `vec3( ${p.map(float).join(", ")} )`).join(",\n\t\t")}
	);
	// the world position of this pixel (the lights of three are in view space, ours are not)
	vec3 wallLampWorld = transpose( mat3( viewMatrix ) ) * geometryPosition + cameraPosition;
	for ( int i = 0; i < ${positions.length}; i ++ ) {
		vec3 toLamp = WALL_LAMP_POSITIONS[ i ] - wallLampWorld;
		float lampDistance = length( toLamp );
		if ( lampDistance >= ${float(WALL_LAMP_LIGHT_DISTANCE)} ) continue;
		vec3 toLampDirection = toLamp / lampDistance;
		// the lamps shine straight down: the angle to the axis is the one of the direction to the pixel
		float spotAttenuation = smoothstep( ${float(Math.cos(WALL_LAMP_LIGHT_ANGLE))}, ${float(Math.cos(WALL_LAMP_LIGHT_ANGLE * (1 - WALL_LAMP_LIGHT_PENUMBRA)))}, toLampDirection.y );
		if ( spotAttenuation <= 0.0 ) continue;
		IncidentLight wallLampLight;
		wallLampLight.direction = mat3( viewMatrix ) * toLampDirection;
		wallLampLight.color = vec3( ${color.r.toFixed(6)}, ${color.g.toFixed(6)}, ${color.b.toFixed(6)} ) * spotAttenuation * getDistanceAttenuation( lampDistance, ${float(WALL_LAMP_LIGHT_DISTANCE)}, ${float(WALL_LAMP_LIGHT_DECAY)} );
		wallLampLight.visible = true;
		RE_Direct( wallLampLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
}
#endif
`;
}

/**
 * Let a lit material (MeshStandardMaterial or MeshPhysicalMaterial) receive the light of the wall lamps.
 * @param {THREE.Material} material
 */
export function receiveWallLamps(material) {
  if (!material.isMeshStandardMaterial) return;
  snippet ??= lampLightGlsl();
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey?.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_end>", `${snippet}\n#include <lights_fragment_end>`);
  };
  material.customProgramCacheKey = () => `${previousKey ? previousKey() : ""}|wall-lamps`;
}

/** The same for every material of an object and its children. */
export function receiveWallLampsDeep(object) {
  const done = new Set();
  object.traverse((o) => {
    for (const m of [].concat(o.material ?? [])) if (!done.has(m)) { done.add(m); receiveWallLamps(m); }
  });
}
