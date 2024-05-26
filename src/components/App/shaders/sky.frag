#version 300 es
#define M_PI 3.1415926535897932384626433832795
precision highp float;

uniform vec3 u_sunPosition;
uniform mat4 u_invViewMatrix;
uniform mat4 u_invProjectionMatrix;
uniform vec2 u_viewport;

out vec4 fragColor;

vec3 getSkyColor(float sunHeight) {
  if (sunHeight < -0.1) {
    return vec3(0.0, 0.0, 0.0);
  } else if (sunHeight < 0.25) {
    return vec3(1.0, 0.5, 0.0);
  } else {
    return vec3(0.0, 0.5, 1.0);
  }
}

void main() {
  vec2 ndcPos = (gl_FragCoord.xy / u_viewport.xy) * 2.0 - 1.0;
  vec4 worldPos = u_invProjectionMatrix * vec4(ndcPos, 0.0, 1.0);
  worldPos /= worldPos.w;
  vec3 worldDirection = normalize((u_invViewMatrix * worldPos).xyz);

  float sunHeight = u_sunPosition.y;
  vec3 skyColor = getSkyColor(sunHeight);

  float zenithAngle = acos(max(0.0, dot(worldDirection, u_sunPosition)));
  float sunDistance = zenithAngle / M_PI;
  float sunBrightness = smoothstep(0.0, 1.0, sunHeight * 2.0);
  
  vec3 finalColor = mix(skyColor, vec3(1.0), sunBrightness * (1.0 - sunDistance));
  fragColor = vec4(finalColor, 1.0);
}
