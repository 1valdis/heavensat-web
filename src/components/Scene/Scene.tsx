import { useCallback, useEffect, useRef, useState, useSyncExternalStore, MouseEvent as ReactMouseEvent, useMemo } from 'react'
// import { useRegisterSW } from 'virtual:pwa-register/react'
import { degreesToRad } from './celestial'
import useResizeObserver from './use-resize-observer'
import { useCameraControls } from './use-camera-controls'
import { drawScene, selectSceneObject, setupShaderPrograms, ShaderProgramsMap } from './scene-drawing'
import { Location, Panning } from '../../common/types'
import { ConcurrentPropagator } from './propagator'
import { Assets } from '../App/assets-loader'
import { useSatellites } from './use-satellites.js'
import { SatelliteFilter } from '../SatelliteFilter/SatellitesFilter.js'

const maxFov = 120
const minFov = 0.5
const zoomSensitivity = 0.0025

export const Scene = ({
  assets,
  date,
  location,
  selectedStarId,
  setSelectedStarId,
  selectedSatelliteId,
  setSelectedSatelliteId,
  satelliteFilter,
  areSatelliteNamesVisible
}: {
  assets: Assets,
  date: Date,
  location: Location,
  selectedStarId: number | null,
  setSelectedStarId: (id: number | null) => void,
  selectedSatelliteId: number | null,
  setSelectedSatelliteId: (id: number | null) => void,
  satelliteFilter: SatelliteFilter,
  areSatelliteNamesVisible: boolean,
}) => {
  const [viewportX, setViewportX] = useState<number>(window.innerWidth * devicePixelRatio)
  const [viewportY, setViewportY] = useState<number>(window.innerHeight * devicePixelRatio)

  const [panning, setPanning] = useState<Panning>({ x: 0, y: 0 })
  const [fov, setFov] = useState(90)

  const { satellites } = useSatellites(assets)
  const propagator = useMemo(() => new ConcurrentPropagator(satellites, assets.msdfDefinition), [satellites, assets.msdfDefinition])

  useEffect(() => {
    propagator.process(date, location, satelliteFilter)
  }, [date, location, satelliteFilter, propagator])

  const subscribe = useCallback((callback: () => void) => {
    propagator.addEventListener('propagate-result', callback)
    return () => propagator.removeEventListener('propagate-result', callback)
  }, [propagator])
  const propagatedSatellitesVersion = useSyncExternalStore(subscribe, () => propagator.propagatedResultId)

  const ref = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext>(null)

  const [shaderPrograms, setShaderPrograms] = useState<ShaderProgramsMap>()

  useEffect(() => {
    const gl = ref.current!.getContext('webgl2', { antialias: false })!
    glRef.current = gl
    if (!shaderPrograms) {
      setShaderPrograms(setupShaderPrograms(glRef.current, assets))
    }
    // glRef.current!.getExtension('WEBGL_lose_context')?.loseContext()
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
    if (entry.devicePixelContentBoxSize) {
      // NOTE: Only this path gives the correct answer
      // The other paths are an imperfect fallback
      // for browsers that don't provide anyway to do this
      width = entry.devicePixelContentBoxSize[0]!.inlineSize
      height = entry.devicePixelContentBoxSize[0]!.blockSize
    } else if (entry.contentBoxSize) {
      width = entry.contentBoxSize[0]!.inlineSize
      height = entry.contentBoxSize[0]!.blockSize
    } else {
      // legacy
      width = entry.contentRect.width
      height = entry.contentRect.height
    }
    setViewportX(width)
    setViewportY(height)
  })

  useEffect(() => {
    const gl = glRef.current
    if (!gl || !shaderPrograms) return
    gl.canvas.width = viewportX
    gl.canvas.height = viewportY
    gl.viewport(0, 0, viewportX, viewportY)
  }, [shaderPrograms, viewportX, viewportY])

  // const [currentlySelectedCoord, setCurrentlySelectedCoord] = useState<{ x: number, y: number, z: number } | null>(null)

  // const getClickCoord = useCallback((event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
  //   const { top, left } = event.currentTarget.getBoundingClientRect()
  //   const [mouseX, mouseY] = [event.clientX, event.clientY]
  //   const [x, y] = [Math.floor(mouseX - left), Math.floor(mouseY - top)]
  //   const canvas = glRef.current!.canvas as HTMLCanvasElement
  //   const pixelX = x * canvas.width / canvas.clientWidth
  //   const pixelY = canvas.height - y * canvas.height / (canvas as HTMLCanvasElement).clientHeight - 1
  //   const ndcX = (pixelX / viewportX) * 2 - 1
  //   const ndcY = (pixelY / viewportY) * 2 - 1
  //   const ndc1 = vec3.fromValues(ndcX, ndcY, -1)
  //   const ndc2 = vec3.fromValues(ndcX, ndcY, 1)
  //   const { projectionMatrix, groundViewMatrix } = createMatrices({
  //     viewport: { x: viewportX, y: viewportY },
  //     fov,
  //     location,
  //     panning,
  //     date
  //   })
  //   const invertedProjection = mat4.clone(projectionMatrix)
  //   mat4.invert(invertedProjection, projectionMatrix)
  //   const near = vec3.create()
  //   const far = vec3.create()
  //   vec3.transformMat4(near, ndc1, invertedProjection)
  //   vec3.transformMat4(far, ndc2, invertedProjection)
  //   const inverseView = mat4.create()
  //   mat4.invert(inverseView, groundViewMatrix)
  //   const worldNear = vec3.create()
  //   const worldFar = vec3.create()
  //   vec3.transformMat4(worldNear, near, inverseView)
  //   vec3.transformMat4(worldFar, far, inverseView)
  //   const result = vec3.clone(worldFar)
  //   vec3.subtract(result, result, worldNear)
  //   vec3.normalize(result, result)
  //   setCurrentlySelectedCoord({ x: result[0], y: result[1], z: result[2] })
  // }, [date, fov, location, panning, viewportX, viewportY])

  useEffect(() => {
    const gl = glRef.current
    if (!gl || !shaderPrograms) return
    const star = selectedStarId ? assets.catalogs.stars.find(star => star[0] === selectedStarId) : null
    drawScene({
      gl,
      shaderPrograms,
      viewport: { x: viewportX, y: viewportY },
      fov,
      location,
      date,
      panning,
      getPropagationResults: () => propagator.propagated,
      satelliteNamesVisible: areSatelliteNamesVisible,
      selectedStarCoords: star ? [star[2], star[3]] : null
    })
  }, [propagatedSatellitesVersion, shaderPrograms, panning, fov, viewportX, viewportY, location, date, areSatelliteNamesVisible, selectedStarId, assets, propagator])

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
      viewport: { x: viewportX, y: viewportY },
      fov,
      location,
      date,
      panning,
      getPropagationResults: () => propagator.propagated
    })
    if (object) {
      if (object.type === 'satellite') {
        setSelectedSatelliteId(object.satelliteId)
      }
      if (object.type === 'star') {
        setSelectedStarId(object.starId)
      }
    }
  }, [date, fov, location, mouseDownCoords, panning, shaderPrograms, viewportX, viewportY, setSelectedSatelliteId, setSelectedStarId, propagator])

  return (
    <canvas id='sky' ref={ref} onClick={selectObject} onMouseDown={updateMouseDownPosition} />
  )
}
