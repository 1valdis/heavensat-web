#version 300 es
precision highp float;

in vec4 a_position;
in highp int a_instanceId;

flat out highp int vInstanceId;

uniform float u_size;
uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;

void main() {
  gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
  gl_PointSize = u_size;
  vInstanceId = a_instanceId;
}
