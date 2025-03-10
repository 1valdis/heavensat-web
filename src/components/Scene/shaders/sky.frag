#version 300 es
precision highp float;

uniform vec2 u_viewport;
uniform mat4 u_invProjectionMatrix;
uniform mat4 u_invModelViewMatrix;
uniform vec3 u_sunPosition;

out vec4 fragColor;

float toZeroOneRange(float lowerBorder, float higherBorder, float inBetween) {
  return (inBetween - lowerBorder) / (higherBorder - lowerBorder);
}

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
  float greatCircleDistance = acos(dot(u_sunPosition, result));
  // if (greatCircleDistance <= SUN_ANGULAR_SIZE + SUN_ANGULAR_SIZE / 30.0) {
  //   mix(vec4(1, 1, 1, 1), vec4(0, 0, 0.3, 1), smoothstep(SUN_ANGULAR_SIZE, SUN_ANGULAR_SIZE + SUN_ANGULAR_SIZE / 30.0, greatCircleDistance));
  // }
  float sunHeight = asin(u_sunPosition.y);
  float nightSunHeight = -radians(18.0);
  vec4 nightBaseColor = vec4(0, 0, 0, 1);
  float civicTwilightSunHeight = -radians(6.0);
  vec4 civicTwilightBaseColor = vec4(0.1, 0.1, 0.2, 1);
  vec4 civicTwilightAroundSunColor = vec4(0.2, 0, 0, 0);
  float sunZeroHeight = 0.0;
  vec4 sunZeroHeightBaseColor = vec4(0.2, 0.2, 0.4, 1);
  vec4 sunZeroHeightAroundSunColor = vec4(0.4, 0.1, 0, 0);
  float reddishSunHeight = radians(12.0);
  vec4 reddishSunBaseColor = vec4(0.3, 0.3, 0.5, 1);
  vec4 reddishSunAroundSunColor = vec4(0.4, 0.2, 0, 0);
  vec4 dayBaseColor = vec4(0.4, 0.4, 0.6, 1);
  vec4 dayBaseAroundSunColor = vec4(0.4, 0.4, 0.3, 0);
  if (sunHeight < nightSunHeight) {
    fragColor = nightBaseColor;
  }
  float sunDistanceFactor = (1.0 - toZeroOneRange(0.0, radians(90.0), clamp(0.0, radians(90.0), greatCircleDistance)));
  if (sunHeight >= nightSunHeight && sunHeight < civicTwilightSunHeight) {
    float mixed = toZeroOneRange(nightSunHeight, civicTwilightSunHeight, sunHeight);
    fragColor = mix(nightBaseColor, civicTwilightBaseColor, mixed);
    fragColor += mix(vec4(0, 0, 0, 0), civicTwilightAroundSunColor, mixed) * sunDistanceFactor;
  }
  if (sunHeight >= civicTwilightSunHeight && sunHeight < sunZeroHeight) {
    float mixed = toZeroOneRange(civicTwilightSunHeight, sunZeroHeight, sunHeight);
    fragColor = mix(civicTwilightBaseColor, sunZeroHeightBaseColor, mixed);
    fragColor += mix(civicTwilightAroundSunColor, sunZeroHeightAroundSunColor, mixed) * sunDistanceFactor;
  }
  if (sunHeight >= sunZeroHeight && sunHeight < reddishSunHeight) {
    float mixed = toZeroOneRange(sunZeroHeight, reddishSunHeight, sunHeight);
    fragColor = mix(sunZeroHeightBaseColor, reddishSunBaseColor, mixed);
    fragColor += mix(sunZeroHeightAroundSunColor, reddishSunAroundSunColor, mixed) * sunDistanceFactor;
  }
  if (sunHeight >= reddishSunHeight) {
    float mixed = toZeroOneRange(reddishSunHeight, 1.0, sunHeight);
    fragColor = mix(reddishSunBaseColor, dayBaseColor, mixed);
    fragColor += mix(reddishSunAroundSunColor, dayBaseAroundSunColor, mixed) * sunDistanceFactor;
  }
  vec4 addDependingOnHeight = length(fragColor.xyz) * 1.0 * (vec4(0.2, 0.2, 0.1, 0) * (1.0 - toZeroOneRange(0.0, radians(30.0), clamp(result.y, 0.0, radians(30.0)))));
  fragColor += addDependingOnHeight;
}
