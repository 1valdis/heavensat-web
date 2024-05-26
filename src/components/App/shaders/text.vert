#version 300 es
precision highp float;
uniform sampler2D u_spriteTexture;
uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;
uniform vec2 u_viewportInPixels;
uniform float size;

in vec2 a_position;
in vec4 a_origin;
in vec2 a_uvCoord;
out vec4 color;

out vec2 uvCoord;

void main() {
  ivec2 spriteSize = textureSize(u_spriteTexture, 0);
  vec4 projectedOriginKek = u_projectionMatrix * u_modelViewMatrix * a_origin;
  vec4 projectedOrigin = projectedOriginKek / abs(projectedOriginKek.w);
  uvCoord = vec2(a_uvCoord.x / float(textureSize(u_spriteTexture, 0).x), a_uvCoord.y / float(textureSize(u_spriteTexture, 0).y));
  if (spriteSize.y == 512) {
    color = vec4(1.0, 0.0, 0.0, 1.0);
  }
  gl_Position = vec4(projectedOrigin.x + (a_position.x / u_viewportInPixels.x / 24.0 * size), projectedOrigin.y - (a_position.y / u_viewportInPixels.y / 24.0 * size), projectedOrigin.z, projectedOrigin.w);
}
