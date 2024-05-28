#version 300 es
precision highp float;

flat in highp int vInstanceId;

layout(location=0) out vec4 color;
layout(location=1) out highp int instanceId;

// in vec4 v_color;

uniform vec4 u_color;
uniform sampler2D u_spriteTexture;

void main() {
  float clampedY = clamp((gl_PointCoord.y - 0.25) * 2.0, 0.0, 1.0);
  color = vec4(u_color.rgb, texture(u_spriteTexture, vec2(gl_PointCoord.x, clampedY)).a);
  // color = vec4(1.0,1.0,1.0,1.0);
  instanceId = vInstanceId;
}
