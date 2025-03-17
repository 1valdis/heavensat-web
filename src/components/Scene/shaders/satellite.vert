#version 300 es
precision highp float;

in vec4 a_position;
in highp int a_instanceId;
in highp int a_shadow; // 0 = not in shadow, 1 = shadow

flat out highp int vInstanceId;
flat out highp int v_shadow;

uniform float u_size;
uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;

void main() {
  v_shadow = a_shadow;
  gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
  gl_PointSize = u_size;
  vInstanceId = a_instanceId;
}
