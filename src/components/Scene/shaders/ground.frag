#version 300 es
precision highp float;

uniform vec2 u_viewport;
uniform mat4 u_invProjectionMatrix;
uniform mat4 u_invModelViewMatrix;

out vec4 fragColor;

void main() {
  vec2 ndcPixelCoord = vec2(
    gl_FragCoord.x / u_viewport.x * 2.0 - 1.0,
    gl_FragCoord.y / u_viewport.y * 2.0 - 1.0
  );
  vec4 ndc1 = vec4(ndcPixelCoord.xy, -1, 1);
  vec4 ndc2 = vec4(ndcPixelCoord.xy, 1, 1);
  vec4 near = u_invProjectionMatrix * ndc1;
  vec4 far = u_invProjectionMatrix * ndc2;
  vec4 worldNear = u_invModelViewMatrix * near;
  vec4 worldFar = u_invModelViewMatrix * far;
  vec3 perspectiveDividedWorldNear = worldNear.xyz / worldNear.w;
  vec3 perspectiveDividedWorldFar =  worldFar.xyz / worldFar.w;
  vec3 result = normalize(perspectiveDividedWorldFar - perspectiveDividedWorldNear);
  if (result.y <= 0.0) {
    fragColor = vec4(0.15, 0.09, 0.09, 1.0);
  }
}
