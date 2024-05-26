#version 300 es
precision highp float;

in vec4 v_color;

out vec4 color;

void main() {
  float clampedY = clamp((gl_PointCoord.y - 0.25) * 2.0, 0.0, 1.0);
  color = v_color;
}
