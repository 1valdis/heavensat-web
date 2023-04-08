export const starVertexSource = `#version 300 es
  precision highp float;

  in vec4 a_position;
  in mediump float a_size;
  in vec4 a_color;

  out vec4 v_color;
  out float v_size;

  uniform mat4 u_projectionMatrix;
  uniform mat4 u_modelViewMatrix;

  void main() {
    gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
    gl_PointSize = a_size;
    v_color = a_color;
    v_size = a_size;
  }
`

export const starFragmentSource = `#version 300 es
  precision highp float;

  out vec4 starColor;

  in vec4 v_color;
  in float v_size;

  void main() {
    float radius = 0.5 * v_size;
    vec2 coord = gl_PointCoord.xy - vec2(0.5, 0.5);
    float distanceFromCenter = length(coord) * v_size;
    float alpha = smoothstep(radius, radius - 1.0, distanceFromCenter);
    starColor = vec4(v_color.r, v_color.g, v_color.b, v_color.a * alpha);
  }
`

export const lineVertexSource = `#version 300 es
  precision highp float;
  in vec4 a_position;

  uniform mat4 u_projectionMatrix;
  uniform mat4 u_modelViewMatrix;

  void main() {
    gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
  }
`

export const lineFragmentSource = `#version 300 es
  precision highp float;
  out vec4 lineColor;

  void main() {
    lineColor = vec4(0.7, 0.7, 0.7, 1.0);
  }
`

export const groundVertexSource = `#version 300 es
  precision highp float;
  in vec4 a_position;

  uniform mat4 u_projectionMatrix;
  uniform mat4 u_modelViewMatrix;

  void main() {
    gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
  }
`

export const groundFragmentSource = `#version 300 es
  precision highp float;
  out vec4 groundColor;

  void main() {
    groundColor = vec4(0.1, 0.1, 0.1, 1.0);
  }
`

