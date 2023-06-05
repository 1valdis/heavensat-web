import { mat4 } from 'gl-matrix'
import { bvToRgb, decimalYear, degreesToRad, raDecToCartesian } from './celestial'
import { initShaderProgram } from './webgl'
import { groundFragmentSource, groundVertexSource, constellationFragmentSource, constellationVertexSource, satelliteFragmentSource, satelliteVertexSource, starFragmentSource, starVertexSource, gridLineVertexSource, gridLineFragmentSource, textFragmentShader, textVertexShader } from './shaders'
import * as satellite from 'satellite.js'
import { Viewport, Panning, Location, HIPStar } from './common-types'
import { Assets } from './assets-loader'
import { PropagationResults } from './propagator'

export type ShaderProgramsMap = {
  stars: {
    program: WebGLProgram,
    buffers: {
      positions: WebGLBuffer,
      sizes: WebGLBuffer,
      colors: WebGLBuffer
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
  },
  satelliteNames: {
    program: WebGLProgram,
    texture: WebGLTexture,
  }
  grid: WebGLProgram,
  // starsForPicking: {
  //   program: WebGLProgram,
  //   buffers: {
  //     positions: WebGLBuffer,
  //     sizes: WebGLBuffer
  //   },
  // },
  // satellitesForPicking: {
  //   program: WebGLProgram,
  // },
  // debug: WebGLProgram
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
      },
      verticesCount: starPositions.length / 2
    },
    // starsForPicking: {
    //   program: initShaderProgram(gl, )
    // },
    constellations: {
      program: initShaderProgram(gl, constellationVertexSource, constellationFragmentSource),
      buffers: {
        positions: constellationPositionsBuffer
      },
      verticesCount: constellationLines.length / 2
    },
    ground: {
      program: initShaderProgram(gl, groundVertexSource, groundFragmentSource),
      buffers: {
        positions: groundPositionBuffer
      }
    },
    satellites: {
      program: initShaderProgram(gl, satelliteVertexSource, satelliteFragmentSource),
      texture: satelliteTexture
    },
    satelliteNames: {
      program: initShaderProgram(gl, textVertexShader, textFragmentShader),
      texture: textTexture
    },
    grid: initShaderProgram(gl, gridLineVertexSource, gridLineFragmentSource)
    // debug: initShaderProgram(gl, debugVertexSource, debugFragmentSource)
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

const drawSatellites = (gl: WebGL2RenderingContext, { program, texture }: ShaderProgramsMap['satellites'], propagatedSatellites: Float32Array, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

  gl.bindTexture(gl.TEXTURE_2D, texture)

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

const raToRad = (hours: number, minutes: number, seconds: number) => (hours + minutes / 60 + seconds / 3600) * 15 * Math.PI / 180
const decToRad = (degrees: number, minutes: number, seconds: number) => (degrees + minutes / 60 + seconds / 3600) * Math.PI / 180

export const drawDebug = (gl: WebGL2RenderingContext, program: WebGLProgram, projectionMatrix: mat4, modelViewMatrix: mat4) => {
  gl.useProgram(program)

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

const drawNames = (gl: WebGL2RenderingContext, { program, texture }: ShaderProgramsMap['satelliteNames'], propagationResults: PropagationResults, projectionMatrix: mat4, modelViewMatrix: mat4, viewport: Viewport) => {
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

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, propagationResults.textsPositions, gl.DYNAMIC_DRAW)
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)

  const uvCoordBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, uvCoordBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, propagationResults.textsUVCoords, gl.DYNAMIC_DRAW)
  const uvCoordLocation = gl.getAttribLocation(program, 'a_uvCoord')
  gl.vertexAttribPointer(uvCoordLocation, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(uvCoordLocation)

  const originCoordBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, originCoordBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, propagationResults.textsOrigins, gl.DYNAMIC_DRAW)
  const originCoordLocation = gl.getAttribLocation(program, 'a_origin')
  gl.vertexAttribPointer(originCoordLocation, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(originCoordLocation)

  gl.drawArrays(gl.TRIANGLES, 0, propagationResults.textsPositions.length / 2)
}

// const drawSkyGradient = (gl: WebGL2RenderingContext, { program, buffers }: ShaderProgramsMap['skyGradient'], projectionMatrix: mat4, modelViewMatrix: mat4) => {
//   gl.useProgram(program)

//   gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions)
//   const positionLocation = gl.getAttribLocation(program, 'a_position')
//   gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
//   gl.enableVertexAttribArray(positionLocation)

//   const sunPositionLocation = gl.getUniformLocation(program, 'u_sunPosition')
//   gl.uniform3fv(sunPositionLocation, raDecToCartesian(raToRad(2, 7, 19), decToRad(12, 52, 31)))

//   const inverseProjectionMatrix = mat4.create()
//   mat4.invert(inverseProjectionMatrix, projectionMatrix)
//   const projectionLocation = gl.getUniformLocation(program, 'u_invProjectionMatrix')
//   gl.uniformMatrix4fv(
//     projectionLocation,
//     false,
//     inverseProjectionMatrix)

//   const inverseModelViewMatrix = mat4.create()
//   mat4.invert(inverseModelViewMatrix, modelViewMatrix)
//   const modelViewLocation = gl.getUniformLocation(program, 'u_invModelViewMatrix')
//   gl.uniformMatrix4fv(
//     modelViewLocation,
//     false,
//     inverseModelViewMatrix)

//   const invertedMatrix = mat4.clone(projectionMatrix)
//   mat4.multiply(invertedMatrix, projectionMatrix, modelViewMatrix)
//   mat4.invert(invertedMatrix, invertedMatrix)
//   const invertedLocation = gl.getUniformLocation(program, 'u_inverted')
//   gl.uniformMatrix4fv(
//     invertedLocation,
//     false,
//     invertedMatrix)

//   const [, , width, height] = gl.getParameter(gl.VIEWPORT)

//   const viewportLocation = gl.getUniformLocation(program, 'u_viewport')
//   gl.uniform2f(
//     viewportLocation,
//     width, height
//   )

//   gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
// }

export const drawScene = ({ gl, shaderPrograms, viewport, fov, location, panning, date, propagatedSatellites, satelliteNamesVisible }: {
  gl: WebGL2RenderingContext;
  shaderPrograms: ShaderProgramsMap;
  viewport: Viewport;
  fov: number;
  location: Location;
  date: Date
  panning: Panning;
  propagatedSatellites: PropagationResults,
  satelliteNamesVisible: boolean
}) => {
  gl.clear(gl.COLOR_BUFFER_BIT)

  const { projectionMatrix, skyViewMatrix, groundViewMatrix } = createMatrices({ viewport, fov, location, panning, date })

  // drawSkyGradient(gl, shaderPrograms.skyGradient, projectionMatrix, skyViewMatrix)
  drawConstellations(gl, shaderPrograms.constellations, date, projectionMatrix, skyViewMatrix)
  // drawGrid(gl, shaderPrograms.grid, projectionMatrix, groundViewMatrix)
  drawStars(gl, shaderPrograms.stars, date, projectionMatrix, skyViewMatrix)
  drawSatellites(gl, shaderPrograms.satellites, propagatedSatellites.propagatedPositions, projectionMatrix, groundViewMatrix)
  drawGround(gl, shaderPrograms.ground, projectionMatrix, groundViewMatrix)
  if (satelliteNamesVisible) {
    drawNames(gl, shaderPrograms.satelliteNames, propagatedSatellites, projectionMatrix, groundViewMatrix, viewport)
  }
  // drawDebug(gl, shaderPrograms.debug, projectionMatrix, skyViewMatrix)
}

export const selectSceneObject = ({ gl, point, viewport, fov, location, panning, date }: {
  gl: WebGL2RenderingContext,
  point: { x: number, y: number },
  viewport: Viewport;
  fov: number
  location: Location
  date: Date
  panning: Panning }) => {
  const pickingFramebuffer = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, pickingFramebuffer)

  const pickingTexture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, pickingTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickingTexture, 0)

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  const { projectionMatrix, skyViewMatrix, groundViewMatrix } = createMatrices({ viewport, fov, location, panning, date })

  // drawStars(gl, shaderPrograms.stars, date, projectionMatrix, skyViewMatrix)
  // drawSatellites(gl, shaderPrograms.satellites, propagatedSatellites.propagatedPositions, projectionMatrix, groundViewMatrix)

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, null)
}

const createMatrices = ({ viewport, fov, location, panning, date }: {
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

  return {
    projectionMatrix,
    skyViewMatrix,
    groundViewMatrix
  }
}
