import { mat4 } from 'gl-matrix'
import { Body, Equator, Horizon, Observer } from 'astronomy-engine'
import { bvToRgb, decimalYear, degreesToRad, lookAnglesToCartesian } from './celestial.js'
import { initShaderProgram } from './webgl.js'
import * as shaders from './shaders/index.js'
import * as satellite from 'satellite.js'
import { Viewport, Panning, Location, HIPStar } from '../common-types.js'
import { Assets } from '../App/assets-loader.js'
import { PropagationResults } from './propagator.js'

export type ShaderProgramsMap = {
  sky: {
    program: WebGLProgram,
    buffers: {
      positions: WebGLBuffer,
    }
  }
  stars: {
    program: WebGLProgram,
    buffers: {
      positions: WebGLBuffer,
      sizes: WebGLBuffer,
      colors: WebGLBuffer
      ids: WebGLBuffer,
    },
    verticesCount: number,
  },
  constellations: {
    program: WebGLProgram,
    buffers: {
      positions: WebGLBuffer
    },
    verticesCount: number,
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
    buffers: {
      positions: WebGLBuffer,
      ids: WebGLBuffer
    }
  },
  satelliteNames: {
    program: WebGLProgram,
    texture: WebGLTexture,
    buffers: {
      texts: WebGLBuffer
    }
  },
  grid: WebGLProgram,
  debug: WebGLProgram
}

export const setupShaderPrograms = (gl: WebGL2RenderingContext, assets: Assets): ShaderProgramsMap => {
  const hipparcosMap = new Map<number, HIPStar>()
  assets.catalogs.stars.forEach((item) => {
    hipparcosMap.set(item[0], {
      id: item[0],
      mag: item[1],
      raDec: [degreesToRad(item[2]), degreesToRad(item[3])],
      bv: item[4]
    })
  })

  const constellationLines = assets.catalogs.constellations.map(constellation => constellation.slice(2))
    .flat().flatMap(hipIndex => {
      const star = hipparcosMap.get(hipIndex as number) // since the name is cut off by slicing
      if (!star) throw new Error(`No star with id ${hipIndex}`)
      return star.raDec
    })

  const hipparcos = Array.from(hipparcosMap.values())
  const starPositions = new Float32Array(hipparcos.flatMap(star => star.raDec))
  const starSizes = new Float32Array(hipparcos.map(star => Math.max((10 - star.mag) * window.devicePixelRatio, 2)))
  const starColors = new Float32Array(hipparcos.flatMap(star => bvToRgb(star.bv)))
  const starIds = new Int32Array(hipparcos.map(star => star.id))

  gl.clearColor(0, 0, 0, 1)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const satelliteTexture = gl.createTexture()!
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, satelliteTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, assets.textures.satellite.width, assets.textures.satellite.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, assets.textures.satellite)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST)
  gl.generateMipmap(gl.TEXTURE_2D)

  const textTexture = gl.createTexture()!
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, textTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, assets.textures.text.width, assets.textures.text.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, assets.textures.text)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  const starsPositionBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, starsPositionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, starPositions, gl.STATIC_DRAW)

  const sizeBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, starSizes, gl.STATIC_DRAW)

  const colorBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, starColors, gl.STATIC_DRAW)

  const starIdsBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, starIdsBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, starIds, gl.STATIC_DRAW)

  const constellationPositionsBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, constellationPositionsBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(constellationLines), gl.STATIC_DRAW)

  const satellitePositionsBuffer = gl.createBuffer()!
  const satelliteIdsBuffer = gl.createBuffer()!
  const satelliteNamesBuffer = gl.createBuffer()!

  const groundPositionBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, groundPositionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    1, 1,
    -1, 1,
    -1, -1,
    1, -1
  ]), gl.STATIC_DRAW)

  const skyPositionBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, skyPositionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    1, 1,
    -1, 1,
    -1, -1,
    1, -1
  ]), gl.STATIC_DRAW)

  return {
    sky: {
      program: initShaderProgram(gl, shaders.skyVertex, shaders.skyFragment),
      buffers: {
        positions: skyPositionBuffer
      }
    },
    stars: {
      program: initShaderProgram(gl, shaders.starVertex, shaders.starFragment),
      buffers: {
        positions: starsPositionBuffer,
        sizes: sizeBuffer,
        colors: colorBuffer,
        ids: starIdsBuffer
      },
      verticesCount: starPositions.length / 2
    },
    constellations: {
      program: initShaderProgram(gl, shaders.constellationVertex, shaders.constellationFragment),
      buffers: {
        positions: constellationPositionsBuffer
      },
      verticesCount: constellationLines.length / 2
    },
    ground: {
      program: initShaderProgram(gl, shaders.groundVertex, shaders.groundFragment),
      buffers: {
        positions: groundPositionBuffer
      }
    },
    satellites: {
      program: initShaderProgram(gl, shaders.satelliteVertex, shaders.satelliteFragment),
      texture: satelliteTexture,
      buffers: {
        positions: satellitePositionsBuffer,
        ids: satelliteIdsBuffer
      }
    },
    satelliteNames: {
      program: initShaderProgram(gl, shaders.textVertex, shaders.textFragment),
      texture: textTexture,
      buffers: {
        texts: satelliteNamesBuffer
      }
    },
    grid: initShaderProgram(gl, shaders.gridVertex, shaders.gridFragment),
    debug: initShaderProgram(gl, shaders.debugVertex, shaders.debugFragment)
  }
}

const drawStars = (gl: WebGL2RenderingContext, { program, buffers, verticesCount }: ShaderProgramsMap['stars'], date: Date, projectionMatrix: mat4, modelViewMatrix: mat4) => {
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

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.ids)
  const instanceLocation = gl.getAttribLocation(program, 'a_instanceId')
  gl.vertexAttribIPointer(instanceLocation, 1, gl.INT, 0, 0)
  gl.enableVertexAttribArray(instanceLocation)

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
  gl.drawArrays(gl.POINTS, 0, verticesCount)
}

const drawConstellations = (gl: WebGL2RenderingContext, { program, buffers, verticesCount }: ShaderProgramsMap['constellations'], date: Date, projectionMatrix: mat4, modelViewMatrix: mat4) => {
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

  gl.drawArrays(gl.LINES, 0, verticesCount)
}

const drawGround = (gl: WebGL2RenderingContext, { program, buffers }: ShaderProgramsMap['ground'], projectionMatrix: mat4, modelViewMatrix: mat4, viewport: Viewport) => {
  gl.useProgram(program)

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions)
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)

  const inverseProjectionMatrix = mat4.create()
  mat4.invert(inverseProjectionMatrix, projectionMatrix)
  const projectionLocation = gl.getUniformLocation(program, 'u_invProjectionMatrix')
  gl.uniformMatrix4fv(
    projectionLocation,
    false,
    inverseProjectionMatrix)

  const inverseModelViewMatrix = mat4.create()
  mat4.invert(inverseModelViewMatrix, modelViewMatrix)
  const modelViewLocation = gl.getUniformLocation(program, 'u_invModelViewMatrix')
  gl.uniformMatrix4fv(
    modelViewLocation,
    false,
    inverseModelViewMatrix)

  const viewportLocation = gl.getUniformLocation(program, 'u_viewport')
  gl.uniform2f(
    viewportLocation,
    viewport.x, viewport.y
  )

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
}

const drawSatellites = (gl: WebGL2RenderingContext, { program, texture, buffers }: ShaderProgramsMap['satellites'], getPropagationResults: () => PropagationResults, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)

  const { propagatedIds, propagatedPositions } = getPropagationResults()

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions)
  gl.bufferData(gl.ARRAY_BUFFER, propagatedPositions, gl.STREAM_DRAW)
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.ids)
  gl.bufferData(gl.ARRAY_BUFFER, propagatedIds, gl.STREAM_DRAW)
  const instanceLocation = gl.getAttribLocation(program, 'a_instanceId')
  gl.vertexAttribIPointer(instanceLocation, 1, gl.INT, 0, 0)
  gl.enableVertexAttribArray(instanceLocation)

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
  gl.drawArrays(gl.POINTS, 0, propagatedPositions.length / 3)
}

const azimuthalGrid = new Float32Array(Array.from({ length: 9 }, (item, index) => {
  const angleRad = index * 20 * (Math.PI / 180)
  const x = Math.sin(angleRad)
  const z = Math.cos(angleRad)
  return [
    x, 0, z,
    0, 1, 0,
    0, 1, 0,
    -x, 0, -z
  ]
}).flat())

export const drawGrid = (gl: WebGL2RenderingContext, program: WebGLProgram, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, azimuthalGrid, gl.STATIC_DRAW)
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

  // gl.drawArrays(gl.LINES, 0, constellationLines.length / 3)
}

// const raToRad = (hours: number, minutes: number, seconds: number) => (hours + minutes / 60 + seconds / 3600) * 15 * Math.PI / 180
// const decToRad = (degrees: number, minutes: number, seconds: number) => (degrees + minutes / 60 + seconds / 3600) * Math.PI / 180

export const drawDebug = (gl: WebGL2RenderingContext, program: WebGLProgram, projectionMatrix: mat4, modelViewMatrix: mat4, point: { x: number, y: number, z: number }) => {
  gl.useProgram(program)

  const debugPointPositions = [
    // ...([
    //   [47.89689, 0.13530],
    //   [47.816, 1.282]
    // ] as const).flatMap((pair) => lookAnglesToCartesian(degreesToRad(pair[0]), degreesToRad(pair[1]))),
    // ...raDecToCartesian(raToRad(2, 31, 48.7), decToRad(89, 15, 51))
    // ...raDecToCartesian(degreesToRad(point[0]), degreesToRad(point[1]))
    point.x, point.y, point.z
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

const drawNames = (gl: WebGL2RenderingContext, { program, texture, buffers }: ShaderProgramsMap['satelliteNames'], getPropagationResults: () => PropagationResults, projectionMatrix: mat4, modelViewMatrix: mat4, viewport: Viewport) => {
  gl.useProgram(program)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)

  const textureLocation = gl.getUniformLocation(program, 'u_spriteTexture')
  gl.uniform1i(textureLocation, 0)
  const viewportInPixelsLocation = gl.getUniformLocation(program, 'u_viewportInPixels')
  gl.uniform2f(viewportInPixelsLocation, viewport.x, viewport.y)
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
  const sizeLocation = gl.getUniformLocation(program, 'size')
  gl.uniform1f(sizeLocation, 12 * window.devicePixelRatio)

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  const uvCoordLocation = gl.getAttribLocation(program, 'a_uvCoord')
  const originCoordLocation = gl.getAttribLocation(program, 'a_origin')

  const propagationResults = getPropagationResults()

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texts)
  gl.bufferData(gl.ARRAY_BUFFER, propagationResults.texts, gl.STREAM_DRAW)

  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 7 * 4, 0)
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(originCoordLocation, 3, gl.FLOAT, false, 7 * 4, 2 * 4)
  gl.enableVertexAttribArray(originCoordLocation)
  gl.vertexAttribPointer(uvCoordLocation, 2, gl.FLOAT, false, 7 * 4, 5 * 4)
  gl.enableVertexAttribArray(uvCoordLocation)

  gl.drawArrays(gl.TRIANGLES, 0, propagationResults.texts.length / 7)
}

const drawSky = (gl: WebGL2RenderingContext, { program, buffers }: ShaderProgramsMap['sky'], projectionMatrix: mat4, modelViewMatrix: mat4, viewport: Viewport, date: Date, location: Location) => {
  gl.useProgram(program)

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions)
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)

  const observer = new Observer(location.latitude, location.longitude, location.altitude)
  const sunPosition = Equator(Body.Sun, date, observer, true, false)
  const hor = Horizon(date, observer, sunPosition.ra, sunPosition.dec)
  const cartesian = lookAnglesToCartesian(degreesToRad(hor.altitude), degreesToRad(hor.azimuth))

  const sunPositionLocation = gl.getUniformLocation(program, 'u_sunPosition')
  gl.uniform3f(sunPositionLocation, cartesian[0], cartesian[1], cartesian[2])

  const inverseProjectionMatrix = mat4.create()
  mat4.invert(inverseProjectionMatrix, projectionMatrix)
  const projectionLocation = gl.getUniformLocation(program, 'u_invProjectionMatrix')
  gl.uniformMatrix4fv(
    projectionLocation,
    false,
    inverseProjectionMatrix)

  const inverseModelViewMatrix = mat4.create()
  mat4.invert(inverseModelViewMatrix, modelViewMatrix)
  const modelViewLocation = gl.getUniformLocation(program, 'u_invModelViewMatrix')
  gl.uniformMatrix4fv(
    modelViewLocation,
    false,
    inverseModelViewMatrix)

  const viewportLocation = gl.getUniformLocation(program, 'u_viewport')
  gl.uniform2f(
    viewportLocation,
    viewport.x, viewport.y
  )

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
}

// const drawSolarSystemBodies = (gl: WebGL2RenderingContext, date: Date, location: Location) => {
//   const observer = new Observer(location.latitude, location.longitude, location.altitude)
//   const [sun, moon, mercury, venus, mars, saturn, jupiter, uranus, neptune] =
//     [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars, Body.Saturn, Body.Jupiter, Body.Uranus, Body.Neptune]
//       .map(body => {
//         const observer = new Observer(location.latitude, location.longitude, location.altitude)
//         const bodyPosition = Equator(body, date, observer, true, false)
//         const hor = Horizon(date, observer, bodyPosition.ra, bodyPosition.dec)
//         return lookAnglesToCartesian(degreesToRad(hor.altitude), degreesToRad(hor.azimuth))
//       })
// }

export const createMatrices = ({ viewport, fov, location, panning, date }: {
  viewport: Viewport;
  fov: number;
  location: Location;
  date: Date
  panning: Panning;
}): { projectionMatrix: mat4, skyViewMatrix: mat4, groundViewMatrix: mat4 } => {
  const projectionMatrix = mat4.create()

  mat4.perspective(projectionMatrix,
    degreesToRad(fov),
    viewport.x / viewport.y,
    0.1,
    2)

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
  // mat4.translate(skyViewMatrix, skyViewMatrix, [0, 0, 2])

  const groundViewMatrix = mat4.create()
  mat4.multiply(groundViewMatrix, panningMatrix, groundViewMatrix)
  // mat4.translate(groundViewMatrix, groundViewMatrix, [0, 0, 2])

  return {
    projectionMatrix,
    skyViewMatrix,
    groundViewMatrix
  }
}

export const drawScene = ({ gl, shaderPrograms, viewport, fov, location, panning, date, getPropagationResults, satelliteNamesVisible, selectedStarCoords }: {
  gl: WebGL2RenderingContext;
  shaderPrograms: ShaderProgramsMap;
  viewport: Viewport;
  fov: number;
  location: Location;
  date: Date
  panning: Panning;
  getPropagationResults: () => PropagationResults,
  satelliteNamesVisible: boolean,
  selectedStarCoords: null | [ra: number, dec: number]
}) => {
  gl.clear(gl.COLOR_BUFFER_BIT)

  const { projectionMatrix, skyViewMatrix, groundViewMatrix } = createMatrices({ viewport, fov, location, panning, date })

  drawSky(gl, shaderPrograms.sky, projectionMatrix, groundViewMatrix, viewport, date, location)
  drawConstellations(gl, shaderPrograms.constellations, date, projectionMatrix, skyViewMatrix)
  // drawGrid(gl, shaderPrograms.grid, projectionMatrix, groundViewMatrix)
  drawStars(gl, shaderPrograms.stars, date, projectionMatrix, skyViewMatrix)
  // drawSolarSystemBodies(gl)
  drawGround(gl, shaderPrograms.ground, projectionMatrix, groundViewMatrix, viewport)
  drawSatellites(gl, shaderPrograms.satellites, getPropagationResults, projectionMatrix, groundViewMatrix)
  if (satelliteNamesVisible) {
    drawNames(gl, shaderPrograms.satelliteNames, getPropagationResults, projectionMatrix, groundViewMatrix, viewport)
  }
  // if (selectedPoint) {
  //   drawDebug(gl, shaderPrograms.debug, projectionMatrix, groundViewMatrix, selectedPoint)
  // }
}

function cleanup (gl: WebGL2RenderingContext) {
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.clearColor(0, 0, 0, 1)
}

export const selectSceneObject = ({ gl, shaderPrograms, point, viewport, fov, location, panning, date, getPropagationResults }: {
  gl: WebGL2RenderingContext,
  shaderPrograms: ShaderProgramsMap,
  point: { x: number, y: number },
  viewport: Viewport;
  fov: number
  location: Location
  date: Date
  panning: Panning
  getPropagationResults: () => PropagationResults
}
): { type: 'satellite', satelliteId: number } | { type: 'star', starId: number } | null => {
  const { projectionMatrix, groundViewMatrix, skyViewMatrix } = createMatrices({ viewport, fov, location, panning, date })

  const instanceTexture = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, instanceTexture)
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32I, viewport.x, viewport.y)

  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, instanceTexture, 0)
  gl.drawBuffers([gl.NONE, gl.COLOR_ATTACHMENT1])

  gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]))

  const value = new Int32Array(1)
  gl.readBuffer(gl.COLOR_ATTACHMENT1)

  const pixelX = point.x * gl.canvas.width / (gl.canvas as HTMLCanvasElement).clientWidth
  const pixelY = gl.canvas.height - point.y * gl.canvas.height / (gl.canvas as HTMLCanvasElement).clientHeight - 1

  drawSatellites(gl, shaderPrograms.satellites, getPropagationResults, projectionMatrix, groundViewMatrix)

  gl.readPixels(
    pixelX, // x
    pixelY, // y
    1, // width
    1, // height
    gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT), // format
    gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE), // type
    value // typed array to hold result
  )

  if (value[0]) {
    cleanup(gl)
    return { type: 'satellite', satelliteId: value[0] }
  }

  drawStars(gl, shaderPrograms.stars, date, projectionMatrix, skyViewMatrix)

  gl.readPixels(
    pixelX, // x
    pixelY, // y
    1, // width
    1, // height
    gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT), // format
    gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE), // type
    value // typed array to hold result
  )

  cleanup(gl)

  if (value[0]) {
    return { type: 'star', starId: value[0] }
  }

  return null
}
