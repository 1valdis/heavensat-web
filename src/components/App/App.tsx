import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { degreesToRad } from '../../util/celestial'
import useResizeObserver from './use-resize-observer'
import { useLatest } from './use-latest'
import { useCameraControls } from './use-camera-controls'
import { drawScene, Location, Panning, setupShaderPrograms, ShaderProgramsMap, Viewport } from './scene'
import { Menu } from '../Ui/Menu'

const maxFov = 120
const minFov = 0.5
const zoomSensitivity = 0.3

function App () {
  const [viewport, setViewport] = useState<Viewport>({ x: window.innerWidth, y: window.innerHeight })
  const latestViewport = useLatest(viewport).current
  const [panning, setPanning] = useState<Panning>({ x: 0, y: 0 })
  const [fov, setFov] = useState(90)

  const [location, setLocation] = useState<Location>({ latitude: 0, longitude: 0, altitude: 0 })
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
    return () => Object.values(shaderPrograms ?? {}).forEach(program => gl.deleteProgram(program))
  }, [shaderPrograms])

  const updatePanning = useCallback((dx: number, dy: number) => {
    setPanning(({ x: oldRotX, y: oldRotY }) => ({
      x: Math.max(Math.min(oldRotX + ((dx * fov / 100)) * window.devicePixelRatio, degreesToRad(90)), degreesToRad(-90)),
      y: oldRotY + (dy * (1 / (Math.abs(Math.cos(oldRotX)) + 0.01)) * fov / 100) * window.devicePixelRatio
    }))
  }, [fov])
  const updateZoomByDelta = useCallback((delta: number) => {
    setFov((fov) => {
      const newFov = fov + (zoomSensitivity * fov * (Math.abs(delta) / delta))
      return Math.max(minFov, Math.min(newFov, maxFov))
    })
  }, [])
  const updateZoomByRatio = useCallback((ratio: number) => {
    setFov((fov) => {
      return Math.max(minFov, Math.min(fov * ratio, maxFov))
    })
  }, [])

  useCameraControls(ref, {
    setRotation: updatePanning,
    changeZoom: updateZoomByDelta,
    multiplyZoom: updateZoomByRatio
  })

  useResizeObserver(ref, (entry) => {
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
    if (latestViewport.x !== viewport.x || latestViewport.y !== viewport.y) {
      gl.canvas.width = viewport.x
      gl.canvas.height = viewport.y
      gl.viewport(0, 0, viewport.x, viewport.y)
    }
    drawScene({
      gl,
      shaderPrograms,
      viewport,
      fov,
      location,
      date,
      panning
    })
  }, [shaderPrograms, panning, fov, viewport, latestViewport, location, date])

  return (
    <div className="App">
      <canvas id="sky" ref={ref} width={viewport.x} height={viewport.y}></canvas>
      <Menu
        date={date}
        setDate={setDate}
        setLocation={setLocation}
        />
    </div>
  )
}

export default App
