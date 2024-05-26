#version 300 es
precision highp float;

in vec4 v_color;
in float v_size;

out vec4 starColor;

void main() {
  float radius = 0.5 * v_size;
  vec2 coord = gl_PointCoord.xy - vec2(0.5, 0.5);
  float distanceFromCenter = length(coord) * v_size;
  float alpha = 1.0 - round(smoothstep(radius, radius, distanceFromCenter));
  starColor = vec4(v_color.rgb, v_color.a * alpha);
}
