import { mat4, vec3 } from 'gl-matrix'
import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import hipparcosCatalogOriginal from '../../hipparcos_8_concise.json'
import constellationLineship from '../../constellationLineship.json'
import { bvToRgb, degreesToRad, getLocalSiderealTime, raDecToCartesian } from '../../util/celestial'
import { initShaderProgram } from '../../util/webgl'
import { starVertexSource, starFragmentSource, lineVertexSource, lineFragmentSource } from './shaders'
import useResizeObserver from './use-resize-observer'
import { useLatest } from './use-latest'

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
const sizes = hipparcosCartesian.map(star => Math.max((8 - star.mag) * window.devicePixelRatio, 1))
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

function useScrollToZoom (elementRef: RefObject<HTMLCanvasElement>, handleZoom: (delta: number) => void) {
  const handleScroll = useCallback((event: WheelEvent) => {
    handleZoom(event.deltaY)
  }, [handleZoom])

  useEffect(() => {
    if (!elementRef.current) return
    const element = elementRef.current
    element.addEventListener('wheel', handleScroll)
    return () => {
      element.removeEventListener('wheel', handleScroll)
    }
  }, [elementRef, handleScroll])
}

const fovs = [120, 90, 60, 45, 30, 15, 10, 5, 3, 2, 1, 0.5]

function App () {
  const [viewport, setViewport] = useState<{ x: number, y: number }>({ x: window.innerWidth, y: window.innerHeight })
  const latestViewport = useLatest(viewport).current
  const [panning, setPanning] = useState({ rotX: 0, rotY: 0 })
  const [fovIndex, setFovIndex] = useState(0)

  const [location, setLocation] = useState<{ latitude: number, longitude: number, altitude: number }>({ latitude: 0, longitude: 0, altitude: 0 })
  const [date, setDate] = useState(new Date())

  const ref = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext>()

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
    setPanning(({ rotX: oldRotX, rotY: oldRotY }) => ({
      rotX: Math.max(Math.min(oldRotX + ((dx * fovs[fovIndex]! / 100)) * window.devicePixelRatio, degreesToRad(90)), degreesToRad(-90)),
      rotY: oldRotY + (dy * (1 / (Math.abs(Math.cos(oldRotX)) + 0.01)) * fovs[fovIndex]! / 100) * window.devicePixelRatio
    }))
  })
  useScrollToZoom(ref, (delta) => {
    if (delta >= 0 && fovIndex > 0) {
      setFovIndex((index) => index - 1)
    } else if (delta <= 0 && fovIndex < fovs.length - 1) {
      setFovIndex((index) => index + 1)
    }
  })
  const observer = useResizeObserver(ref, (entry) => {
    if (!glRef.current) return
    let width
    let height
    let dpr = window.devicePixelRatio
    if (entry.devicePixelContentBoxSize) {
      // NOTE: Only this path gives the correct answer
      // The other paths are an imperfect fallback
      // for browsers that don't provide anyway to do this
      width = entry.devicePixelContentBoxSize[0]!.inlineSize
      height = entry.devicePixelContentBoxSize[0]!.blockSize
      dpr = 1 // it's already in width and height
    } else if (entry.contentBoxSize) {
      width = entry.contentBoxSize[0]!.inlineSize
      height = entry.contentBoxSize[0]!.blockSize
    } else {
      // legacy
      width = entry.contentRect.width
      height = entry.contentRect.height
    }
    const displayWidth = Math.round(width * dpr)
    const displayHeight = Math.round(height * dpr)
    setViewport({ x: displayWidth, y: displayHeight })
  })

  useEffect(() => {
    const gl = glRef.current
    if (!gl || !shaderPrograms) return

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const projectionMatrix = mat4.create()

    mat4.perspective(projectionMatrix,
      degreesToRad(fovs[fovIndex]!),
      viewport.x / viewport.y,
      0,
      100)

    const viewMatrix = mat4.create()
    mat4.identity(viewMatrix)

    mat4.rotate(viewMatrix, viewMatrix, degreesToRad(-90), [1, 0, 0])

    const latitudeRadians = location.latitude * (Math.PI / 180)
    const tiltMatrix = mat4.create()
    const lstRadians = getLocalSiderealTime(date, location.longitude) + degreesToRad(90)
    mat4.rotateX(tiltMatrix, tiltMatrix, latitudeRadians)
    mat4.rotateY(tiltMatrix, tiltMatrix, -lstRadians)

    const panningMatrix = mat4.create()
    mat4.identity(panningMatrix)
    mat4.rotateY(panningMatrix, panningMatrix, panning.rotY)
    mat4.rotateX(panningMatrix, panningMatrix, panning.rotX)
    mat4.invert(panningMatrix, panningMatrix)

    mat4.multiply(viewMatrix, tiltMatrix, viewMatrix)
    mat4.multiply(viewMatrix, panningMatrix, viewMatrix)

    if (latestViewport.x !== viewport.x || latestViewport.y !== viewport.y) {
      gl.canvas.width = viewport.x
      gl.canvas.height = viewport.y
      gl.viewport(0, 0, viewport.x, viewport.y)
    }

    drawLines(gl, shaderPrograms.constellations, projectionMatrix, viewMatrix)
    drawStars(gl, shaderPrograms.stars, projectionMatrix, viewMatrix)
  }, [shaderPrograms, panning, fovIndex, viewport, latestViewport, location, date])

  return (
    <div className="App">
      <canvas id="sky" ref={ref} width={viewport.x} height={viewport.y}></canvas>
      <nav>
        <button onClick={() => setDate((date) => { const newDate = new Date(date); newDate.setTime(newDate.getTime() + (60 * 60 * 1000)); return newDate })}>+1 hour</button>
        <button onClick={ () => navigator.geolocation.getCurrentPosition((position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, altitude: position.coords.altitude ?? 0 })) }>Locate</button>
      </nav>
    </div>
  )
}

export default App
