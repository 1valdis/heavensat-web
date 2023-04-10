export const starVertexSource = `#version 300 es
  precision highp float;

  in vec2 a_raDec;
  in float a_size;
  in vec4 a_color;

  out vec4 v_color;
  out float v_size;

  uniform mat4 u_projectionMatrix;
  uniform mat4 u_modelViewMatrix;
  uniform float u_timeYears;

  // https://astronomy.stackexchange.com/a/26835

  vec2 accountForPrecession(vec2 raDec) {
    float T = (u_timeYears - 2000.0) / 100.0;
    float M = radians(1.2812323 * T + 0.0003879 * T * T + 0.0000101 * T * T * T);
    float N = radians(0.5567530 * T - 0.0001185 * T * T + 0.0000116 * T * T * T);
    return vec2(
      M + N * sin(raDec[0]) * tan(raDec[1]) + raDec[0],
      N * cos(raDec[0]) + raDec[1]
    );
  }

  vec4 raDecToPosition(vec2 raDec) {
    return vec4(
      cos(raDec[0]) * cos(raDec[1]),
      sin(raDec[0]) * cos(raDec[1]),
      sin(raDec[1]),
      1.0
    );
  }

  void main() {
    gl_Position = u_projectionMatrix * u_modelViewMatrix * raDecToPosition(accountForPrecession(a_raDec));
    gl_PointSize = a_size;
    v_color = a_color;
    v_size = a_size;
  }
`

export const starFragmentSource = `#version 300 es
  precision highp float;

  out vec4 starColor;

  in vec4 v_color;
  in float v_size;

  void main() {
    float radius = 0.5 * v_size;
    vec2 coord = gl_PointCoord.xy - vec2(0.5, 0.5);
    float distanceFromCenter = length(coord) * v_size;
    float alpha = smoothstep(radius, radius - 1.0, distanceFromCenter);
    starColor = vec4(v_color.r, v_color.g, v_color.b, v_color.a * alpha);
  }
`

export const constellationVertexSource = `#version 300 es
  precision highp float;

  in vec2 a_raDec;

  uniform mat4 u_projectionMatrix;
  uniform mat4 u_modelViewMatrix;
  uniform float u_timeYears;

  // https://astronomy.stackexchange.com/a/26835

  vec2 accountForPrecession(vec2 raDec) {
    float T = (u_timeYears - 2000.0) / 100.0;
    float M = radians(1.2812323 * T + 0.0003879 * T * T + 0.0000101 * T * T * T);
    float N = radians(0.5567530 * T - 0.0001185 * T * T + 0.0000116 * T * T * T);
    return vec2(
      M + N * sin(raDec[0]) * tan(raDec[1]) + raDec[0],
      N * cos(raDec[0]) + raDec[1]
    );
  }

  vec4 raDecToPosition(vec2 raDec) {
    return vec4(
      cos(raDec[0]) * cos(raDec[1]),
      sin(raDec[0]) * cos(raDec[1]),
      sin(raDec[1]),
      1.0
    );
  }

  void main() {
    gl_Position = u_projectionMatrix * u_modelViewMatrix * raDecToPosition(accountForPrecession(a_raDec));
  }
`

export const constellationFragmentSource = `#version 300 es
  precision highp float;
  out vec4 lineColor;

  void main() {
    lineColor = vec4(0.7, 0.7, 0.7, 1.0);
  }
`

export const groundVertexSource = `#version 300 es
  precision highp float;
  in vec4 a_position;

  uniform mat4 u_projectionMatrix;
  uniform mat4 u_modelViewMatrix;

  void main() {
    gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
  }
`

export const groundFragmentSource = `#version 300 es
  precision highp float;
  out vec4 groundColor;

  void main() {
    groundColor = vec4(0.1, 0.1, 0.1, 0.8);
  }
`

export const satelliteVertexSource = `#version 300 es
  precision highp float;

  in vec4 a_position;

  uniform float u_size;
  uniform mat4 u_projectionMatrix;
  uniform mat4 u_modelViewMatrix;

  void main() {
    gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
    gl_PointSize = u_size;
  }
`

export const satelliteFragmentSource = `#version 300 es
  precision highp float;

  out vec4 color;

  // in vec4 v_color;

  uniform vec4 u_color;
  uniform sampler2D u_spriteTexture;

  void main() {
    float clampedY = clamp((gl_PointCoord.y - 0.25) * 2.0, 0.0, 1.0);
    color = vec4(u_color.rgb, texture(u_spriteTexture, vec2(gl_PointCoord.x, clampedY)).a);
    // color = vec4(1.0,1.0,1.0,1.0);
  }
`
