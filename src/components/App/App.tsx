import { mat4, vec3 } from 'gl-matrix'
import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { useAnimationFrame } from '../../useAnimationFrame'
import hipparcosCatalogOriginal from '../../hipparcos_8_concise.json'
import constellationLineship from '../../constellationLineship.json'
import { bvToRgb, degreesToRad, raDecToCartesian } from '../../util/celestial'
import { initShaderProgram } from '../../util/webgl'
import { starVertexSource, starFragmentSource, lineVertexSource, lineFragmentSource } from './shaders'

type HIPStarOriginal = [number, number, number, number, number]

type HIPStar = {
  id: number,
  coords: vec3,
  bv: number,
  mag: number
}

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
const sizes = hipparcosCartesian.map(star => Math.max((5 - star.mag), 1))
const colors = hipparcosCartesian.map(star => bvToRgb(star.bv)).flat()

function drawStars (gl: WebGL2RenderingContext, program: WebGLProgram, projectionMatrix: mat4, modelViewMatrix: mat4) {
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

function drawLines (gl: WebGL2RenderingContext, program: WebGLProgram, projectionMatrix: mat4, modelViewMatrix: mat4) {
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(constellationLines.flat() as number[]), gl.STATIC_DRAW)
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)
  gl.lineWidth(0.5)

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

type ShaderProgramsMap = {
  stars: WebGLProgram,
  constellations: WebGLProgram
}

function setupShaderPrograms (gl: WebGL2RenderingContext): ShaderProgramsMap {
  return {
    stars: initShaderProgram(gl, starVertexSource, starFragmentSource),
    constellations: initShaderProgram(gl, lineVertexSource, lineFragmentSource)
  }
}

function useSphericalPanning (elementRef: RefObject<HTMLCanvasElement>, handleRotation: (deltaX: number, deltaY: number) => void) {
  const [panning, setPanning] = useState(false)
  // const [previousPoint, setPreviousPoint] = useState<{x: number, y: number} | null>(null)

  const handlePointerDown = useCallback(() => {
    setPanning(true)
  }, [])

  const handlePointerUp = useCallback(() => {
    setPanning(false)
  }, [])

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (panning && elementRef.current) {
      const dx = event.movementX
      const dy = event.movementY
      const maxCanvasSize = Math.max(elementRef.current.width, elementRef.current.height)
      const rotationX = dy * Math.PI / maxCanvasSize
      const rotationY = dx * Math.PI / maxCanvasSize
      handleRotation(rotationX, rotationY)
    }
  }, [handleRotation, elementRef, panning])

  useEffect(() => {
    if (!elementRef.current) return
    const element = elementRef.current
    element.addEventListener('pointerdown', handlePointerDown)
    element.addEventListener('pointerleave', handlePointerUp)
    element.addEventListener('pointercancel', handlePointerUp)
    element.addEventListener('pointerup', handlePointerUp)
    element.addEventListener('pointermove', handlePointerMove)
    return () => {
      element.removeEventListener('pointerdown', handlePointerDown)
      element.removeEventListener('pointerleave', handlePointerUp)
      element.removeEventListener('pointercancel', handlePointerUp)
      element.removeEventListener('pointerup', handlePointerUp)
      element.removeEventListener('pointermove', handlePointerMove)
    }
  }, [elementRef, handlePointerDown, handlePointerMove, handlePointerUp])
}

function App () {
  const [rotation, setRotation] = useState(0)
  const [{ rotX, rotY }, setRotationAngles] = useState({ rotX: 0, rotY: 0 })

  const ref = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext>()

  useAnimationFrame(deltaTime => {
    // Pass on a function to the setter of the state
    // to make sure we always have the latest state
    setRotation(prevCount => prevCount + deltaTime * 0.0001)
  })

  const [shaderPrograms, setShaderPrograms] = useState<ShaderProgramsMap>()

  useEffect(() => {
    const gl = ref.current!.getContext('webgl2')!
    glRef.current = gl
    if (!shaderPrograms) {
      setShaderPrograms(setupShaderPrograms(glRef.current))
    }
    // no cleanup of shader programs since they are set up only once
    return () => Object.values(shaderPrograms ?? {}).forEach(program => gl.deleteProgram(program))
  }, [shaderPrograms])

  useSphericalPanning(ref, (dx, dy) => {
    setRotationAngles({ rotX: Math.max(Math.min(rotX + dx, degreesToRad(90)), degreesToRad(-90)), rotY: rotY + dy })
  })

  useEffect(() => {
    const gl = glRef.current
    if (!gl || !shaderPrograms) return

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const fieldOfView = 60 * Math.PI / 180 // in radians
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight
    const zNear = 0
    const zFar = 100.0
    const projectionMatrix = mat4.create()

    mat4.perspective(projectionMatrix,
      fieldOfView,
      aspect,
      zNear,
      zFar)

    const modelViewMatrix = mat4.create()

    mat4.translate(modelViewMatrix,
      modelViewMatrix,
      [0.0, 0.0, -2])

    mat4.rotate(modelViewMatrix,
      modelViewMatrix,
      degreesToRad(-90),
      [1, 0, 0])

    const newRotationMatrix = mat4.create()
    mat4.rotateZ(newRotationMatrix, newRotationMatrix, rotY)
    mat4.rotateX(newRotationMatrix, newRotationMatrix, rotX)
    mat4.invert(newRotationMatrix, newRotationMatrix)

    mat4.multiply(modelViewMatrix, modelViewMatrix, newRotationMatrix)

    drawLines(gl, shaderPrograms.constellations, projectionMatrix, modelViewMatrix)
    drawStars(gl, shaderPrograms.stars, projectionMatrix, modelViewMatrix)
  }, [shaderPrograms, rotation, rotX, rotY])

  return (
    <div className="App">
      <canvas ref={ref} width={1000} height={800}></canvas>
    </div>
  )
}

export default App
