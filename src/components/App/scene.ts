import { mat4 } from 'gl-matrix'
import hipparcosCatalogOriginal from '../../hipparcos_8_concise.json'
import constellationLineship from '../../constellationLineship.json'
import { bvToRgb, decimalYear, degreesToRad, raDecToCartesian } from './celestial'
import { initShaderProgram } from './webgl'
import { groundFragmentSource, groundVertexSource, constellationFragmentSource, constellationVertexSource, satelliteFragmentSource, satelliteVertexSource, starFragmentSource, starVertexSource, gridLineVertexSource, gridLineFragmentSource, debugVertexSource, debugFragmentSource } from './shaders'
// import * as satellitewasm from 'assemblyscript-satellitejs'
import * as satellite from 'satellite.js'
import { satelliteTexture } from './textures'
import { Viewport, Panning, Location } from './common-types'

type HIPStarOriginal = [number, number, number, number, number]

type HIPStar = {
  id: number,
  raDec: [number, number],
  bv: number,
  mag: number
}

export type ShaderProgramsMap = {
  stars: {
    program: WebGLProgram,
    buffers: {
      positions: WebGLBuffer,
      sizes: WebGLBuffer,
      colors: WebGLBuffer
    }
  },
  constellations: {
    program: WebGLProgram,
    buffers: {
      positions: WebGLBuffer
    }
  },
  ground: {
    program: WebGLProgram,
    buffers: {
      positions: WebGLBuffer
    }
  },
  satellites: {
    program: WebGLProgram,
    texture: WebGLTexture,
  },
  grid: WebGLProgram,
  // debug: WebGLProgram
}

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

const starPositions = new Float32Array(hipparcos.flatMap(star => star.raDec))
const starSizes = new Float32Array(hipparcos.map(star => Math.max((10 - star.mag) * window.devicePixelRatio, 2)))
const starColors = new Float32Array(hipparcos.flatMap(star => bvToRgb(star.bv)))

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

  const starsPositionBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, starsPositionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, starPositions, gl.STATIC_DRAW)

  const sizeBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, starSizes, gl.STATIC_DRAW)

  const colorBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, starColors, gl.STATIC_DRAW)

  const constellationPositionsBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, constellationPositionsBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(constellationLines), gl.STATIC_DRAW)

  const groundPositionBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, groundPositionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -0.0001, -1,
    1, -0.0001, -1,
    1, -0.0001, 1,
    -1, -0.0001, 1
  ]), gl.STATIC_DRAW)

  return {
    stars: {
      program: initShaderProgram(gl, starVertexSource, starFragmentSource),
      buffers: {
        positions: starsPositionBuffer,
        sizes: sizeBuffer,
        colors: colorBuffer
      }
    },
    constellations: {
      program: initShaderProgram(gl, constellationVertexSource, constellationFragmentSource),
      buffers: {
        positions: constellationPositionsBuffer
      }
    },
    ground: {
      program: initShaderProgram(gl, groundVertexSource, groundFragmentSource),
      buffers: {
        positions: groundPositionBuffer
      }
    },
    satellites: {
      texture,
      program: initShaderProgram(gl, satelliteVertexSource, satelliteFragmentSource)
    },
    grid: initShaderProgram(gl, gridLineVertexSource, gridLineFragmentSource)
    // debug: initShaderProgram(gl, debugVertexSource, debugFragmentSource)
  }
}

const drawStars = (gl: WebGL2RenderingContext, { program, buffers }: ShaderProgramsMap['stars'], date: Date, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions)
  const positionLocation = gl.getAttribLocation(program, 'a_raDec')
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sizes)
  const sizeLocation = gl.getAttribLocation(program, 'a_size')
  gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(sizeLocation)

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colors)
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

const drawConstellations = (gl: WebGL2RenderingContext, { program, buffers }: ShaderProgramsMap['constellations'], date: Date, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions)
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

const drawGround = (gl: WebGL2RenderingContext, { program, buffers }: ShaderProgramsMap['ground'], projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions)
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

const drawSatellites = (gl: WebGL2RenderingContext, program: WebGLProgram, propagatedSatellites: Float32Array, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, propagatedSatellites, gl.DYNAMIC_DRAW)
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
  gl.drawArrays(gl.POINTS, 0, propagatedSatellites.length / 3)
}

const azimuthalGrid = Array.from({ length: 9 }, (item, index) => {
  const angleRad = index * 20 * (Math.PI / 180)
  const x = Math.sin(angleRad)
  const z = Math.cos(angleRad)
  return [
    x, 0, z,
    0, 1, 0,
    0, 1, 0,
    -x, 0, -z
  ]
}).flat()

export const drawGrid = (gl: WebGL2RenderingContext, program: WebGLProgram, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(azimuthalGrid), gl.STATIC_DRAW)
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

  gl.drawArrays(gl.LINES, 0, constellationLines.length / 3)
}

export const drawDebug = (gl: WebGL2RenderingContext, program: WebGLProgram, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  const raToRad = (hours: number, minutes: number, seconds: number) => (hours + minutes / 60 + seconds / 3600) * 15 * Math.PI / 180
  const decToRad = (degrees: number, minutes: number, seconds: number) => (degrees + minutes / 60 + seconds / 3600) * Math.PI / 180

  const debugPointPositions = [
    // ...([
    //   [47.89689, 0.13530],
    //   [47.816, 1.282]
    // ] as const).flatMap((pair) => lookAnglesToCartesian(degreesToRad(pair[0]), degreesToRad(pair[1]))),
    ...raDecToCartesian(raToRad(2, 31, 48.7), decToRad(89, 15, 51))
  ]

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(debugPointPositions), gl.STATIC_DRAW)
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
  gl.drawArrays(gl.POINTS, 0, debugPointPositions.length / 3)
}

export const drawScene = ({ gl, shaderPrograms, viewport, fov, location, panning, date, propagatedSatellites }: {
  gl: WebGL2RenderingContext;
  shaderPrograms: ShaderProgramsMap;
  viewport: Viewport;
  fov: number;
  location: Location;
  date: Date
  panning: Panning;
  propagatedSatellites: Float32Array
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
  // drawGrid(gl, shaderPrograms.grid, projectionMatrix, groundViewMatrix)
  drawStars(gl, shaderPrograms.stars, date, projectionMatrix, skyViewMatrix)
  drawSatellites(gl, shaderPrograms.satellites.program, propagatedSatellites, projectionMatrix, groundViewMatrix)
  drawGround(gl, shaderPrograms.ground, projectionMatrix, groundViewMatrix)
  // drawDebug(gl, shaderPrograms.debug, projectionMatrix, skyViewMatrix)
}
