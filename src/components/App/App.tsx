import { useCallback, useEffect, useRef, useState, useSyncExternalStore, MouseEvent as ReactMouseEvent } from 'react'
import './App.css'
import { degreesToRad } from './celestial'
import useResizeObserver from './use-resize-observer'
import { useLatest } from './use-latest'
import { useCameraControls } from './use-camera-controls'
import { drawScene, selectSceneObject, setupShaderPrograms, ShaderProgramsMap } from './scene'
import { Menu } from '../Ui/Menu'
import { Viewport, Location, Panning } from './common-types'
import { ConcurrentPropagator } from './propagator'
import { getAssets } from './assets-loader'
import { useTimeControls } from './use-time-controls'
import { useSatellites } from './use-satellites.js'

const maxFov = 120
const minFov = 0.5
const zoomSensitivity = 0.0025

const propagator = new ConcurrentPropagator()

function App () {
  const [viewport, setViewport] = useState<Viewport>({ x: window.innerWidth, y: window.innerHeight })
  const latestViewport = useLatest(viewport).current
  const [panning, setPanning] = useState<Panning>({ x: 0, y: 0 })
  const [fov, setFov] = useState(90)

  const [location, setLocation] = useState<Location>({ latitude: 0, longitude: 0, altitude: 0 })
  const { start, stop, isPlaying, date, setDate } = useTimeControls()
  const [satelliteNamesVisible, setSatelliteNamesVisible] = useState(true)
  const switchSatelliteNamesVisibility = useCallback(() => setSatelliteNamesVisible(current => !current), [setSatelliteNamesVisible])

  const assets = getAssets()

  const { satellitesMap, satellites } = useSatellites(assets)

  const [selectedStarId, setSelectedStarId] = useState<number | null>(null)
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<number | null>(null)

  useEffect(() => {
    propagator.init(satellites, assets.msdfDefinition)
  }, [satellites, assets])

  useEffect(() => {
    propagator.process(date, location)
  }, [date, location])

  const subscribe = useCallback((callback: () => void) => {
    propagator.addEventListener('propagate-result', callback)
    return () => propagator.removeEventListener('propagate-result', callback)
  }, [])
  const propagatedSatellites = useSyncExternalStore(subscribe, () => propagator.propagated)

  const ref = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext>()

  const [shaderPrograms, setShaderPrograms] = useState<ShaderProgramsMap>()

  useEffect(() => {
    const gl = ref.current!.getContext('webgl2', { antialias: false, desynchronized: true })!
    glRef.current = gl
    if (!shaderPrograms) {
      setShaderPrograms(setupShaderPrograms(glRef.current, assets))
    }
    // no cleanup yet
  }, [shaderPrograms, assets])

  const updatePanning = useCallback((dx: number, dy: number) => {
    setPanning(({ x: oldRotX, y: oldRotY }) => ({
      x: Math.max(Math.min(oldRotX + ((dx * fov / 100)) * window.devicePixelRatio, degreesToRad(90)), degreesToRad(-90)),
      y: oldRotY + (dy * (1 / (Math.abs(Math.cos(oldRotX)) + 0.01)) * fov / 100) * window.devicePixelRatio
    }))
  }, [fov])
  const updateZoomByDelta = useCallback((delta: number) => {
    setFov((fov) => {
      const newFov = fov + (zoomSensitivity * fov * delta)
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
  })

  useEffect(() => {
    const gl = glRef.current
    if (!gl || !shaderPrograms) return
    const star = selectedStarId ? assets.catalogs.stars.find(star => star[0] === selectedStarId) : null
    drawScene({
      gl,
      shaderPrograms,
      viewport,
      fov,
      location,
      date,
      panning,
      propagatedSatellites,
      satelliteNamesVisible,
      selectedStarCoords: star ? [star[2], star[3]] : null
    })
  }, [shaderPrograms, panning, fov, viewport, latestViewport, location, date, propagatedSatellites, satelliteNamesVisible, selectedStarId, assets])

  const [mouseDownCoords, setMouseDownCoords] = useState<{ x: number, y: number } | null>(null)
  const updateMouseDownPosition = useCallback((event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => setMouseDownCoords({ x: event.clientX, y: event.clientY }), [setMouseDownCoords])
  const selectObject = useCallback((event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (mouseDownCoords?.x !== event.clientX || mouseDownCoords?.y !== event.clientY) {
      return
    }
    const gl = glRef.current
    if (!gl || !shaderPrograms) return
    const { top, left } = event.currentTarget.getBoundingClientRect()
    const [mouseX, mouseY] = [event.clientX, event.clientY]
    const [x, y] = [Math.floor(mouseX - left), Math.floor(mouseY - top)]
    const object = selectSceneObject({
      gl,
      shaderPrograms,
      point: { x, y },
      viewport,
      fov,
      location,
      date,
      panning,
      propagatedSatellites: propagatedSatellites.propagatedPositions,
      propagatedIds: propagatedSatellites.propagatedIds
    })
    if (object) {
      if (object.type === 'satellite') {
        setSelectedSatelliteId(object.satelliteId)
      }
      if (object.type === 'star') {
        setSelectedStarId(object.starId)
      }
    }
  }, [date, fov, location, mouseDownCoords, panning, propagatedSatellites, shaderPrograms, viewport])

  return (
    <div className="App">
      <canvas id="sky" ref={ref} width={viewport.x} height={viewport.y} onClick={selectObject} onMouseDown={updateMouseDownPosition}></canvas>
      <Menu
        date={date}
        setDate={setDate}
        location={location}
        setLocation={setLocation}
        startRealtime={start}
        stopRealtime={stop}
        isRealtime={isPlaying}
        switchSatelliteNamesVisibility={switchSatelliteNamesVisibility}
        satelliteNamesVisible={satelliteNamesVisible}
        selectedStarId={selectedStarId}
        selectedSatellite={selectedSatelliteId ? satellitesMap.get(selectedSatelliteId)! : null}
        />
    </div>
  )
}

export default App
