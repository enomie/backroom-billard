/** Shared GLSL noise (value noise and 4-octave fbm) for the smoke, fog and exhale shaders. */
export const NOISE = /* glsl */ `
  float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
  float vnoise( vec2 p ) {
    vec2 i = floor( p ), f = fract( p );
    f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( hash( i ), hash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
  }
  float fbm( vec2 p ) {
    float v = 0.0, a = 0.5;
    for ( int i = 0; i < 4; i++ ) { v += a * vnoise( p ); p = p * 2.03 + 17.0; a *= 0.5; }
    return v;
  }
`;
