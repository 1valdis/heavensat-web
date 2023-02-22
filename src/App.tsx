import { mat4, vec3 } from 'gl-matrix'
import { useEffect, useRef, useState } from 'react'
import './App.css'
import { useAnimationFrame } from './useAnimationFrame'
import hipparcosCatalogOriginal from './hipparcos_8_concise.json'
import constellationLineship from './constellationLineship.json'

function bvToRgb (bv: number): [number, number, number] {
  const temperature = 4600 * ((1 / ((0.92 * bv) + 1.7)) + (1 / ((0.92 * bv) + 0.62)))
  let red, green, blue

  if (temperature <= 6600) {
    red = 1
    green = 0.390 * Math.log10(temperature) - 0.631
  } else {
    red = 1.292 * Math.pow(temperature / 100 - 60, -0.133)
    green = 1.129 * Math.pow(temperature / 100 - 60, -0.075)
  }

  if (temperature <= 1900) {
    blue = 0
  } else if (temperature < 6600) {
    blue = -0.018 * Math.log10(temperature) - 0.258
  } else {
    blue = 0.8 * Math.pow(temperature / 100 - 60, 0.45)
  }

  // Apply gamma correction with a gamma value of 2.2
  red = Math.pow(red, 2.2)
  green = Math.pow(green, 2.2)
  blue = Math.pow(blue, 2.2)

  return [red, green, blue]
}

function raDecToCartesian (ra: number, dec: number): vec3 {
  // Convert equatorial coordinates to spherical coordinates
  const theta = Math.PI / 2 - (dec * Math.PI / 180)
  const phi = ra * Math.PI / 180

  const r = 1

  // Convert spherical coordinates to Cartesian coordinates
  const x = r * Math.sin(theta) * Math.cos(phi)
  const y = r * Math.sin(theta) * Math.sin(phi)
  const z = r * Math.cos(theta)

  return [x, y, z]
}

type HIPStarOriginal = [number, number, number, number, number]

type HIPStar = {
  id: number,
  coords: vec3,
  bv: number,
  mag: number
}

const hipFiltered = hipparcosCatalogOriginal.filter((item) => item[1]! < 6.7)

const hipparcosCartesian: HIPStar[] = (hipFiltered as HIPStarOriginal[]).map((item) => ({
  id: item[0],
  mag: item[1],
  coords: raDecToCartesian(item[2], item[3]),
  bv: item[4]
}))

// const constellationLines = constellationLineship.map(constellation => {
//   const hipIndexes = constellation.slice(2)
//   const pairs = hipIndexes.map((item, index) => {
//     if (index >= hipIndexes.length - 1) return []
//     return [item, hipIndexes[index + 1]]
//   })
//   return pairs.flat()
// }).flat().map(hipIndex => {
//   const star = hipparcosCartesian.find(item => item.id === hipIndex)
//   if (!star) throw new Error(`No star with id ${hipIndex}`)
//   return star.coords
// })

const constellationLines = constellationLineship.map(constellation => constellation.slice(2))
  .flat().map(hipIndex => {
    const star = hipparcosCartesian.find(item => item.id === hipIndex)
    if (!star) throw new Error(`No star with id ${hipIndex}`)
    return star.coords
  })

function loadShader (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!
  // Send the source to the shader object
  gl.shaderSource(shader, source)
  // Compile the shader program
  gl.compileShader(shader)
  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`)
    gl.deleteShader(shader)
    throw new Error("Couldn't compile shader")
  }
  return shader
}

function initShaderProgram (gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)

  // Create the shader program
  const shaderProgram = gl.createProgram()!
  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.linkProgram(shaderProgram)

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`)
    throw new Error("Couldn't initialize shader program")
  }

  return shaderProgram
}

const starVertexSource = `#version 300 es
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

const starFragmentSource = `#version 300 es
  precision highp float;

  out vec4 starColor;

  in vec4 v_color;

  void main() {
    starColor = v_color;
  }
`

const lineVertexSource = `#version 300 es
  precision highp float;
  in vec4 a_position;

  uniform mat4 u_projectionMatrix;
  uniform mat4 u_modelViewMatrix;

  void main() {
    gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
  }
`

const lineFragmentSource = `#version 300 es
  precision highp float;
  out vec4 lineColor;

  void main() {
    lineColor = vec4(0.4, 0.4, 0.4, 1.0);
  }
`

const positions = hipparcosCartesian.map(star => star.coords)
const sizes = hipparcosCartesian.map(star => Math.max((5 - star.mag), 1))
const colors = hipparcosCartesian.map(star => bvToRgb(star.bv))

function drawStars (gl: WebGL2RenderingContext, projectionMatrix: mat4, modelViewMatrix: mat4) {
  const program = initShaderProgram(gl, starVertexSource, starFragmentSource)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions.flat() as number[]), gl.STATIC_DRAW)
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)

  const sizeBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW)
  const sizeLocation = gl.getAttribLocation(program, 'a_size')
  gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(sizeLocation)

  const colorBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors.flat()), gl.STATIC_DRAW)
  const colorLocation = gl.getAttribLocation(program, 'a_color')
  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(colorLocation)

  gl.useProgram(program)

  const projectionLocation = gl.getUniformLocation(program, 'u_projectionMatrix')
  gl.uniformMatrix4fv(
    projectionLocation,
    false,
    projectionMatrix)

  const modelViewLocation = gl.getUniformLocation(program, 'u_modelViewMatrix')
  gl.uniformMatrix4fv(
    modelViewLocation,
    false,
    modelViewMatrix)

  gl.drawArrays(gl.POINTS, 0, hipparcosCartesian.length)
}

function drawLines (gl: WebGL2RenderingContext, projectionMatrix: mat4, modelViewMatrix: mat4) {
  const program = initShaderProgram(gl, lineVertexSource, lineFragmentSource)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(constellationLines.flat() as number[]), gl.STATIC_DRAW)
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)
  gl.lineWidth(0.5)

  gl.useProgram(program)

  const projectionLocation = gl.getUniformLocation(program, 'u_projectionMatrix')
  gl.uniformMatrix4fv(
    projectionLocation,
    false,
    projectionMatrix)

  const modelViewLocation = gl.getUniformLocation(program, 'u_modelViewMatrix')
  gl.uniformMatrix4fv(
    modelViewLocation,
    false,
    modelViewMatrix)

  gl.drawArrays(gl.LINES, 0, constellationLines.length)
}

function App () {
  const ref = useRef<HTMLCanvasElement>(null)

  const [rotation, setRotation] = useState(0)

  useAnimationFrame(deltaTime => {
    // Pass on a function to the setter of the state
    // to make sure we always have the latest state
    setRotation(prevCount => prevCount + deltaTime * 0.0001)
  })

  useEffect(() => {
    const gl = ref.current!.getContext('webgl2')!
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const fieldOfView = 60 * Math.PI / 180 // in radians
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight
    const zNear = 0
    const zFar = 100.0
    const projectionMatrix = mat4.create()

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
      fieldOfView,
      aspect,
      zNear,
      zFar)

    // Set the shader uniforms

    const modelViewMatrix = mat4.create()

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(modelViewMatrix,
      modelViewMatrix,
      [0.0, 0.0, -2])

    mat4.rotate(modelViewMatrix,
      modelViewMatrix,
      rotation,
      [1, 0, 0])

    drawLines(gl, projectionMatrix, modelViewMatrix)
    drawStars(gl, projectionMatrix, modelViewMatrix)
  })

  return (
    <div className="App">
      <canvas ref={ref} width={1000} height={800}></canvas>
    </div>
  )
}

export default App
