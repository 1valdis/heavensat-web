#version 300 es
precision highp float;
in vec4 a_position;

uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;

void main() {
  gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
}
