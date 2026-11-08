/**
 * Light for the smoke shaders (cigarette smoke, exhaled cloud, fog): a GLSL function that
 * returns how much the lamps shine on a point in the room. The ceiling lamps are baked into the
 * code as cones, the candles come from a uniform that candle.js fills. See _docs/look.md.
 */
import * as THREE from "three";
import { FURNITURE_TABLES } from "./furniture-constants.js";
import {
  LAMP_COUNT,
  LAMP_HEIGHT,
  LAMP_SPACING,
  LAMP_SHADE_HEIGHT,
  LAMP_LIGHT_COLOR,
  LAMP_LIGHT_ANGLE,
  SMOKE_LIGHT_AMBIENT,
  SMOKE_LAMP_STRENGTH,
  SMOKE_CANDLE_STRENGTH,
  SMOKE_CANDLE_RADIUS,
} from "./room-constants.js";
import { CANDLE_LIGHT_COLOR, CANDLE_EXTRA_SPOTS } from "./candle-constants.js";

/** Candle positions (flame height), shared by all smoke materials; filled by candle.js. */
export const smokeLightUniforms = {
  uCandles: { value: [...FURNITURE_TABLES, ...CANDLE_EXTRA_SPOTS].map(() => new THREE.Vector3(0, -100, 0)) },
};

const f = (v) => v.toFixed(4);
const color = (hex) => {
  const c = new THREE.Color(hex);
  return `vec3(${f(c.r)}, ${f(c.g)}, ${f(c.b)})`;
};
const apexY = LAMP_HEIGHT + LAMP_SHADE_HEIGHT * 0.5;
const lampLines = Array.from({ length: LAMP_COUNT }, (_, i) => {
  const z = (i - (LAMP_COUNT - 1) / 2) * LAMP_SPACING;
  return `light += lampLight( p, vec3( 0.0, ${f(apexY)}, ${f(z)} ) ) * ${color(LAMP_LIGHT_COLOR)} * ${f(SMOKE_LAMP_STRENGTH)};`;
}).join("\n  ");

export const SMOKE_LIGHT_GLSL = /* glsl */ `
  uniform vec3 uCandles[ ${FURNITURE_TABLES.length + CANDLE_EXTRA_SPOTS.length} ];
  float lampLight( vec3 p, vec3 apex ) {
    vec3 d = p - apex;
    float h = -d.y;
    if ( h <= 0.05 ) return 0.0;
    float edge = h * ${f(Math.tan(LAMP_LIGHT_ANGLE))};
    float cone = 1.0 - smoothstep( edge * 0.5, edge, length( d.xz ) );
    return cone / ( 1.0 + 0.45 * dot( d, d ) );
  }
  vec3 smokeLight( vec3 p ) {
    vec3 light = vec3( ${f(SMOKE_LIGHT_AMBIENT)} );
    ${lampLines}
    for ( int i = 0; i < ${FURNITURE_TABLES.length}; i++ ) {
      vec3 d = p - uCandles[ i ];
      light += ${color(CANDLE_LIGHT_COLOR)} * ${f(SMOKE_CANDLE_STRENGTH)} / ( 1.0 + dot( d, d ) / ${f(SMOKE_CANDLE_RADIUS * SMOKE_CANDLE_RADIUS)} );
    }
    return min( light, vec3( 1.4 ) );
  }
`;
