import { mat4 } from 'gl-matrix'
import hipparcosCatalogOriginal from '../../hipparcos_8_concise.json'
import constellationLineship from '../../constellationLineship.json'
import { bvToRgb, decimalYear, degreesToRad, lookAnglesToCartesian, raDecToCartesian } from './celestial'
import { initShaderProgram } from './webgl'
import { groundFragmentSource, groundVertexSource, constellationFragmentSource, constellationVertexSource, satelliteFragmentSource, satelliteVertexSource, starFragmentSource, starVertexSource } from './shaders'
import * as satellite from 'satellite.js'
import { catalog } from './catalog'
import { satelliteTexture } from './textures'

type HIPStarOriginal = [number, number, number, number, number]

type HIPStar = {
  id: number,
  raDec: [number, number],
  bv: number,
  mag: number
}

export type ShaderProgramsMap = {
  stars: WebGLProgram,
  constellations: WebGLProgram,
  ground: WebGLProgram,
  satellites: {
    program: WebGLProgram,
    texture: WebGLTexture,
  }
}

export type Viewport = {x: number, y: number}
export type Panning = {x: number, y: number}
export type Location = {latitude: number, longitude: number, altitude: number}

const hipparcos: HIPStar[] = (hipparcosCatalogOriginal as HIPStarOriginal[]).map((item) => ({
  id: item[0],
  mag: item[1],
  raDec: [degreesToRad(item[2]), degreesToRad(item[3])],
  bv: item[4]
}))

const constellationLines = constellationLineship.map(constellation => constellation.slice(2))
  .flat().flatMap(hipIndex => {
    const star = hipparcos.find(item => item.id === hipIndex)
    if (!star) throw new Error(`No star with id ${hipIndex}`)
    return star.raDec
  })

const starPositions = hipparcos.flatMap(star => star.raDec)
const starSizes = hipparcos.map(star => Math.max((10 - star.mag) * window.devicePixelRatio, 2))
const starColors = hipparcos.flatMap(star => bvToRgb(star.bv))
const catalogLines = catalog.split('\n')
const satRecs: satellite.SatRec[] = []
for (let i = 0; i < catalogLines.length; i += 3) {
  const satRec = satellite.twoline2satrec(catalogLines[i + 1]!, catalogLines[i + 2]!)
  if (satRec.error === 0) {
    satRecs.push(satRec)
  }
}

export const setupShaderPrograms = (gl: WebGL2RenderingContext): ShaderProgramsMap => {
  gl.clearColor(0, 0, 0, 1)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const texture = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, satelliteTexture.width, satelliteTexture.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, satelliteTexture.buffer)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST)
  gl.generateMipmap(gl.TEXTURE_2D)
  return {
    stars: initShaderProgram(gl, starVertexSource, starFragmentSource),
    constellations: initShaderProgram(gl, constellationVertexSource, constellationFragmentSource),
    ground: initShaderProgram(gl, groundVertexSource, groundFragmentSource),
    satellites: {
      texture,
      program: initShaderProgram(gl, satelliteVertexSource, satelliteFragmentSource)
    }
  }
}

const drawStars = (gl: WebGL2RenderingContext, program: WebGLProgram, date: Date, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starPositions), gl.STATIC_DRAW)
  const positionLocation = gl.getAttribLocation(program, 'a_raDec')
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)

  const sizeBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starSizes), gl.STATIC_DRAW)
  const sizeLocation = gl.getAttribLocation(program, 'a_size')
  gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(sizeLocation)

  const colorBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starColors), gl.STATIC_DRAW)
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
  const timeLocation = gl.getUniformLocation(program, 'u_timeYears')
  gl.uniform1f(
    timeLocation,
    decimalYear(date)
  )
  gl.drawArrays(gl.POINTS, 0, starPositions.length / 2)
}

const drawConstellations = (gl: WebGL2RenderingContext, program: WebGLProgram, date: Date, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(constellationLines), gl.STATIC_DRAW)
  const positionLocation = gl.getAttribLocation(program, 'a_raDec')
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
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

  const timeLocation = gl.getUniformLocation(program, 'u_timeYears')
  gl.uniform1f(
    timeLocation,
    decimalYear(date)
  )

  gl.drawArrays(gl.LINES, 0, constellationLines.length / 2)
}

const drawGround = (gl: WebGL2RenderingContext, program: WebGLProgram, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -0.0001, -1,
    1, -0.0001, -1,
    1, -0.0001, 1,
    -1, -0.0001, 1
  ]), gl.STATIC_DRAW)
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

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
}

const drawSatellites = (gl: WebGL2RenderingContext, program: WebGLProgram, date: Date, observer: { longitude: number, latitude: number, altitude: number }, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  const observerForLib = {
    longitude: satellite.degreesToRadians(observer.longitude),
    latitude: satellite.degreesToRadians(observer.latitude),
    height: observer.altitude / 1000
  }
  const gmst = satellite.gstime(date)

  const satellitePositions = satRecs.flatMap((satRec) => {
    const positionEci = satellite.propagate(satRec, date)
    if (!positionEci.position) return []
    const lookAngles = satellite.ecfToLookAngles(observerForLib, satellite.eciToEcf(positionEci.position as satellite.EciVec3<number>, gmst))
    return lookAnglesToCartesian(lookAngles.elevation, lookAngles.azimuth)
  })
  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(satellitePositions), gl.STATIC_DRAW)
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

  gl.uniform4fv(gl.getUniformLocation(program, 'u_color'), new Float32Array([0, 1, 0, 1]))
  gl.uniform1f(gl.getUniformLocation(program, 'u_size'), 16 * devicePixelRatio)
  gl.drawArrays(gl.POINTS, 0, satellitePositions.length / 3)
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

  const skyViewMatrix = mat4.create()

  const latitudeRadians = location.latitude * (Math.PI / 180)
  const longitudeRadians = location.longitude * (Math.PI / 180)
  const tiltMatrix = mat4.create()
  const lstRadians = satellite.gstime(date) + longitudeRadians
  mat4.rotateX(tiltMatrix, tiltMatrix, -latitudeRadians)
  mat4.rotateZ(tiltMatrix, tiltMatrix, -lstRadians + Math.PI / 2)

  const panningMatrix = mat4.create()
  mat4.identity(panningMatrix)
  mat4.rotateY(panningMatrix, panningMatrix, panning.y)
  mat4.rotateX(panningMatrix, panningMatrix, panning.x)
  mat4.invert(panningMatrix, panningMatrix)

  mat4.multiply(skyViewMatrix, tiltMatrix, skyViewMatrix)
  mat4.multiply(skyViewMatrix, panningMatrix, skyViewMatrix)

  const groundViewMatrix = mat4.create()
  mat4.multiply(groundViewMatrix, panningMatrix, groundViewMatrix)

  drawConstellations(gl, shaderPrograms.constellations, date, projectionMatrix, skyViewMatrix)
  drawStars(gl, shaderPrograms.stars, date, projectionMatrix, skyViewMatrix)
  drawSatellites(gl, shaderPrograms.satellites.program, date, location, projectionMatrix, groundViewMatrix)
  drawGround(gl, shaderPrograms.ground, projectionMatrix, groundViewMatrix)
}
