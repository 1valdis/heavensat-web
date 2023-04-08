import { mat4, vec3 } from 'gl-matrix'
import hipparcosCatalogOriginal from '../../hipparcos_8_concise.json'
import constellationLineship from '../../constellationLineship.json'
import { bvToRgb, degreesToRad, getLocalSiderealTime, raDecToCartesian } from '../../util/celestial'
import { initShaderProgram } from '../../util/webgl'
import { lineFragmentSource, lineVertexSource, starFragmentSource, starVertexSource } from './shaders'

type HIPStarOriginal = [number, number, number, number, number]

type HIPStar = {
  id: number,
  coords: vec3,
  bv: number,
  mag: number
}

export type ShaderProgramsMap = {
  stars: WebGLProgram,
  constellations: WebGLProgram
}

export type Viewport = {x: number, y: number}
export type Panning = {x: number, y: number}
export type Location = {latitude: number, longitude: number, altitude: number}

const hipparcosCartesian: HIPStar[] = (hipparcosCatalogOriginal as HIPStarOriginal[]).map((item) => ({
  id: item[0],
  mag: item[1],
  coords: raDecToCartesian(degreesToRad(item[2]), degreesToRad(item[3])),
  bv: item[4]
}))

const constellationLines = constellationLineship.map(constellation => constellation.slice(2))
  .flat().map(hipIndex => {
    const star = hipparcosCartesian.find(item => item.id === hipIndex)
    if (!star) throw new Error(`No star with id ${hipIndex}`)
    return star.coords
  })

const positions = hipparcosCartesian.map(star => star.coords).flat() as number[]
const sizes = hipparcosCartesian.map(star => Math.max((9 - star.mag) * window.devicePixelRatio, 2))
const colors = hipparcosCartesian.map(star => bvToRgb(star.bv)).flat()

export const setupShaderPrograms = (gl: WebGL2RenderingContext): ShaderProgramsMap => {
  gl.clearColor(0, 0, 0, 1)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  return {
    stars: initShaderProgram(gl, starVertexSource, starFragmentSource),
    constellations: initShaderProgram(gl, lineVertexSource, lineFragmentSource)
  }
}

const drawStars = (gl: WebGL2RenderingContext, program: WebGLProgram, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
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
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)
  const colorLocation = gl.getAttribLocation(program, 'a_color')
  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(colorLocation)

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

const drawLines = (gl: WebGL2RenderingContext, program: WebGLProgram, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(constellationLines.flat() as number[]), gl.STATIC_DRAW)
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)

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

export const drawScene = ({ gl, shaderPrograms, viewport, fov, location, panning, date }: {
  gl: WebGL2RenderingContext;
  shaderPrograms: ShaderProgramsMap;
  viewport: Viewport;
  fov: number;
  location: Location;
  date: Date
  panning: Panning;
}) => {
  gl.clear(gl.COLOR_BUFFER_BIT)

  const projectionMatrix = mat4.create()

  mat4.perspective(projectionMatrix,
    degreesToRad(fov),
    viewport.x / viewport.y,
    0,
    100)

  const viewMatrix = mat4.create()

  const latitudeRadians = location.latitude * (Math.PI / 180)
  const tiltMatrix = mat4.create()
  const lstRadians = getLocalSiderealTime(date, location.longitude)
  mat4.rotateX(tiltMatrix, tiltMatrix, latitudeRadians)
  mat4.rotateY(tiltMatrix, tiltMatrix, -lstRadians)

  const panningMatrix = mat4.create()
  mat4.identity(panningMatrix)
  mat4.rotateY(panningMatrix, panningMatrix, panning.y)
  mat4.rotateX(panningMatrix, panningMatrix, panning.x)
  mat4.invert(panningMatrix, panningMatrix)

  mat4.multiply(viewMatrix, tiltMatrix, viewMatrix)
  mat4.multiply(viewMatrix, panningMatrix, viewMatrix)

  drawLines(gl, shaderPrograms.constellations, projectionMatrix, viewMatrix)
  drawStars(gl, shaderPrograms.stars, projectionMatrix, viewMatrix)
}
