import { mat4 } from 'gl-matrix'
import { useEffect, useRef, useState } from 'react'
import './App.css'
import { useAnimationFrame } from './useAnimationFrame'

interface Buffers { position: WebGLBuffer, color: WebGLBuffer, indices: WebGLBuffer }
interface ProgramInfo { program: WebGLProgram, attribLocations: { [name: string]: GLint }, uniformLocations: { [name: string]: WebGLUniformLocation } }

function loadShader (ctx: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = ctx.createShader(type)!
  // Send the source to the shader object
  ctx.shaderSource(shader, source)
  // Compile the shader program
  ctx.compileShader(shader)
  // See if it compiled successfully
  if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
    alert(`An error occurred compiling the shaders: ${ctx.getShaderInfoLog(shader)}`)
    ctx.deleteShader(shader)
    throw new Error("Couldn't compile shader")
  }
  return shader
}

function initShaderProgram (ctx: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram {
  const vertexShader = loadShader(ctx, ctx.VERTEX_SHADER, vsSource)
  const fragmentShader = loadShader(ctx, ctx.FRAGMENT_SHADER, fsSource)

  // Create the shader program
  const shaderProgram = ctx.createProgram()!
  ctx.attachShader(shaderProgram, vertexShader)
  ctx.attachShader(shaderProgram, fragmentShader)
  ctx.linkProgram(shaderProgram)

  // If creating the shader program failed, alert
  if (!ctx.getProgramParameter(shaderProgram, ctx.LINK_STATUS)) {
    alert(`Unable to initialize the shader program: ${ctx.getProgramInfoLog(shaderProgram)}`)
    throw new Error("Couldn't initialize shader program")
  }

  return shaderProgram
}

function initBuffers (ctx: WebGL2RenderingContext): Buffers {
  // Create a buffer for the square's positions.

  const positionBuffer = ctx.createBuffer()!

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  ctx.bindBuffer(ctx.ARRAY_BUFFER, positionBuffer)

  // Now create an array of positions for the square.

  const positions = [
    // Front face
    -1.0, -1.0, 1.0,
    1.0, -1.0, 1.0,
    1.0, 1.0, 1.0,
    -1.0, 1.0, 1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0, 1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, -1.0, -1.0,

    // Top face
    -1.0, 1.0, -1.0,
    -1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0, 1.0,
    -1.0, -1.0, 1.0,

    // Right face
    1.0, -1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, 1.0, 1.0,
    1.0, -1.0, 1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0, 1.0,
    -1.0, 1.0, 1.0,
    -1.0, 1.0, -1.0
  ]

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  ctx.bufferData(ctx.ARRAY_BUFFER,
    new Float32Array(positions),
    ctx.STATIC_DRAW)

  const faceColors = [
    [1.0, 1.0, 1.0, 1.0], // Front face: white
    [1.0, 0.0, 0.0, 1.0], // Back face: red
    [0.0, 1.0, 0.0, 1.0], // Top face: green
    [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
    [1.0, 1.0, 0.0, 1.0], // Right face: yellow
    [1.0, 0.0, 1.0, 1.0] // Left face: purple
  ]

  const colors: number[][] = []

  for (const c of faceColors) {
    // Repeat each color four times for the four vertices of the face
    colors.push(c, c, c, c)
  }

  const colorBuffer = ctx.createBuffer()!
  ctx.bindBuffer(ctx.ARRAY_BUFFER, colorBuffer)
  ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(colors.flat()), ctx.STATIC_DRAW)

  const indexBuffer = ctx.createBuffer()!
  ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, indexBuffer)

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  const indices = [
    0, 1, 2, 0, 2, 3, // front
    4, 5, 6, 4, 6, 7, // back
    8, 9, 10, 8, 10, 11, // top
    12, 13, 14, 12, 14, 15, // bottom
    16, 17, 18, 16, 18, 19, // right
    20, 21, 22, 20, 22, 23 // left
  ]

  // Now send the element array to GL

  ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices), ctx.STATIC_DRAW)

  return {
    position: positionBuffer,
    color: colorBuffer,
    indices: indexBuffer
  }
}

function drawScene (ctx: WebGL2RenderingContext, programInfo: ProgramInfo, buffers: Buffers, rotation: number): void {
  ctx.clearColor(0.0, 0.0, 0.0, 1.0) // Clear to black, fully opaque
  ctx.clearDepth(1.0) // Clear everything
  ctx.enable(ctx.DEPTH_TEST) // Enable depth testing
  ctx.depthFunc(ctx.LEQUAL) // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT)

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  const fieldOfView = 390 * Math.PI / 180 // in radians
  const aspect = ctx.drawingBufferWidth / ctx.drawingBufferHeight
  const zNear = 0.1
  const zFar = 100.0
  const projectionMatrix = mat4.create()

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
    fieldOfView,
    aspect,
    zNear,
    zFar)

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create()

  // Now move the drawing position a bit to where we want to
  // start drawing the square.

  mat4.translate(modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to translate
    [-0.0, 0.0, -6.0]) // amount to translate

  mat4.rotate(modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to rotate
    rotation, // amount to rotate in radians
    [0, 0, 1]) // axis to rotate around
  mat4.rotate(modelViewMatrix, modelViewMatrix, rotation * 0.6, [0, 1, 0])
  mat4.rotate(modelViewMatrix, modelViewMatrix, rotation * 0.2, [0, 0, 1])

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  {
    const numComponents = 3 // pull out 2 values per iteration
    const type = ctx.FLOAT // the data in the buffer is 32bit floats
    const normalize = false // don't normalize
    const stride = 0 // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0 // how many bytes inside the buffer to start from
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buffers.position)
    ctx.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition!,
      numComponents,
      type,
      normalize,
      stride,
      offset)
    ctx.enableVertexAttribArray(
      programInfo.attribLocations.vertexPosition!)
  }

  {
    const numComponents = 4
    const type = ctx.FLOAT
    const normalize = false
    const stride = 0
    const offset = 0
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buffers.color)
    ctx.vertexAttribPointer(
      programInfo.attribLocations.vertexColor!,
      numComponents,
      type,
      normalize,
      stride,
      offset)
    ctx.enableVertexAttribArray(
      programInfo.attribLocations.vertexColor!)
  }

  // Tell WebGL to use our program when drawing

  ctx.useProgram(programInfo.program)

  // Set the shader uniforms

  ctx.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix!,
    false,
    projectionMatrix)
  ctx.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix!,
    false,
    modelViewMatrix)

  // Tell WebGL which indices to use to index the vertices
  ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, buffers.indices)

  {
    const vertexCount = 36
    const type = ctx.UNSIGNED_SHORT
    const offset = 0
    ctx.drawElements(ctx.TRIANGLES, vertexCount, type, offset)
  }
}

function App () {
  const ref = useRef<HTMLCanvasElement>(null)

  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;
    }
  `

  const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `

  const [rotation, setRotation] = useState(0)

  useAnimationFrame(deltaTime => {
    // Pass on a function to the setter of the state
    // to make sure we always have the latest state
    setRotation(prevCount => prevCount + deltaTime * 0.001)
  })

  useEffect(() => {
    const ctx = ref.current!.getContext('webgl2')!
    ctx.clearColor(0, 0, 0, 1)
    ctx.clear(ctx.COLOR_BUFFER_BIT)

    const shaderProgram = initShaderProgram(ctx, vsSource, fsSource)

    const buffers = initBuffers(ctx)

    const programInfo: ProgramInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: ctx.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexColor: ctx.getAttribLocation(shaderProgram, 'aVertexColor')
      },
      uniformLocations: {
        projectionMatrix: ctx.getUniformLocation(shaderProgram, 'uProjectionMatrix')!,
        modelViewMatrix: ctx.getUniformLocation(shaderProgram, 'uModelViewMatrix')!
      }
    }

    drawScene(ctx, programInfo, buffers, rotation)
  })

  return (
    <div className="App">
      <canvas ref={ref} width={640} height={480}></canvas>
    </div>
  )
}

export default App
