#version 300 es
precision highp float;

in vec4 a_position;
in vec4 a_color;

out vec4 v_color;

uniform float u_size;
uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;

void main() {
  gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
  gl_PointSize = u_size;
  v_color = a_color;
}
