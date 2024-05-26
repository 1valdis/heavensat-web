#version 300 es
precision highp float;

in vec2 a_position;
out vec2 a_positionNDC;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  a_positionNDC = a_position;
}
