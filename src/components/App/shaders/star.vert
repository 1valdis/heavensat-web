#version 300 es
precision highp float;

in vec2 a_raDec;
in float a_size;
in vec4 a_color;
in highp int a_instanceId;

out vec4 v_color;
out float v_size;
flat out highp int vInstanceId;

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
  vInstanceId = a_instanceId;
}
