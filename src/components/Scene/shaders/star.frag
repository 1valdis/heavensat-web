#version 300 es
precision highp float;

flat in highp int vInstanceId;
in vec4 v_color;
in float v_size;

layout(location=0) out vec4 starColor;
layout(location=1) out highp int instanceId;

void main() {
  float radius = 0.5 * v_size;
  vec2 coord = gl_PointCoord.xy - vec2(0.5, 0.5);
  float distanceFromCenter = length(coord) * v_size;
  float alpha = smoothstep(radius, radius - 1.0, distanceFromCenter);
  starColor = vec4(v_color.r, v_color.g, v_color.b, v_color.a * alpha);
  instanceId = vInstanceId;
}
