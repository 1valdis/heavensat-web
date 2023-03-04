export const starVertexSource = `#version 300 es
  precision highp float;

  in vec4 a_position;
  in mediump float a_size;
  in vec4 a_color;

  out vec4 v_color;

  uniform mat4 u_projectionMatrix;
  uniform mat4 u_modelViewMatrix;

  void main() {
    gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
    gl_PointSize = a_size;
    v_color = a_color;
  }
`

export const starFragmentSource = `#version 300 es
  precision highp float;

  out vec4 starColor;

  in vec4 v_color;

  void main() {
    starColor = v_color;
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
    lineColor = vec4(0.4, 0.4, 0.4, 1.0);
  }
`
