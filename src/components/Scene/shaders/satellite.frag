#version 300 es
precision highp float;

flat in highp int vInstanceId;
flat in int v_shadow;

layout(location=0) out vec4 color;
layout(location=1) out highp int instanceId;

uniform sampler2D u_spriteTexture;

void main() {
  float clampedY = clamp((gl_PointCoord.y - 0.25) * 2.0, 0.0, 1.0);
  // color = vec4(vec3(1.0, 1.0, 1.0), texture(u_spriteTexture, vec2(gl_PointCoord.x, clampedY)).a);
  color = vec4(vec3(0.0, 1.0 - 0.5 * (float(v_shadow)), 1.0 * float(v_shadow)), texture(u_spriteTexture, vec2(gl_PointCoord.x, clampedY)).a);
  instanceId = vInstanceId;
}
