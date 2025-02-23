import { RefObject, useCallback, useEffect, useRef } from 'react'

const distance = (deltaX: number, deltaY: number) => {
  return Math.sqrt(deltaX ** 2 + deltaY ** 2)
}

export const useCameraControls = (elementRef: RefObject<HTMLCanvasElement>, options: {
  setRotation: (deltaX: number, deltaY: number) => void,
  changeZoom: (delta: number) => void
  multiplyZoom: (ratio: number) => void
}) => {
  const { setRotation, changeZoom, multiplyZoom } = options
  const pointersDownRef = useRef(new Map<number, PointerEvent>())

  const handleScroll = useCallback((event: WheelEvent) => {
    event.preventDefault()
    changeZoom(event.deltaY)
  }, [changeZoom])

  const handlePointerDown = useCallback((event: PointerEvent) => {
    pointersDownRef.current.set(event.pointerId, event)
  }, [])

  const handlePointerUp = useCallback((event: PointerEvent) => {
    pointersDownRef.current.delete(event.pointerId)
  }, [])

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (event.buttons & 1) {
      pointersDownRef.current.set(event.pointerId, event)
    }
    const pointersDown = Array.from(pointersDownRef.current.values())
    if (pointersDown.length >= 2) {
      const otherEvent = pointersDown.find(cachedEvent => cachedEvent.pointerId !== event.pointerId)!
      const newDistance = distance(otherEvent.clientX - event.clientX, otherEvent.clientY - event.clientY) / pointersDown.length - 1
      const oldDistance = distance(otherEvent.clientX - event.clientX + event.movementX, otherEvent.clientY - event.clientY + event.movementY) / pointersDown.length - 1
      multiplyZoom(oldDistance / newDistance)
    }
    if (pointersDown.length > 0 && elementRef.current) {
      const dx = event.movementX / pointersDown.length
      const dy = event.movementY / pointersDown.length
      const maxCanvasSize = Math.max(elementRef.current.width, elementRef.current.height)
      const rotationX = dy * Math.PI / maxCanvasSize
      const rotationY = dx * Math.PI / maxCanvasSize
      setRotation(rotationX, rotationY)
    }
  }, [elementRef, multiplyZoom, setRotation])

  useEffect(() => {
    if (!elementRef.current) return
    const element = elementRef.current
    element.addEventListener('wheel', handleScroll)
    return () => {
      element.removeEventListener('wheel', handleScroll)
    }
  }, [elementRef, handleScroll])

  useEffect(() => {
    if (!elementRef.current) return
    const element = elementRef.current
    element.addEventListener('pointerdown', handlePointerDown)
    element.addEventListener('pointerleave', handlePointerUp)
    element.addEventListener('pointercancel', handlePointerUp)
    element.addEventListener('pointerup', handlePointerUp)
    return () => {
      element.removeEventListener('pointerdown', handlePointerDown)
      element.removeEventListener('pointerleave', handlePointerUp)
      element.removeEventListener('pointercancel', handlePointerUp)
      element.removeEventListener('pointerup', handlePointerUp)
    }
  }, [elementRef, handlePointerDown, handlePointerUp])

  useEffect(() => {
    if (!elementRef.current) return
    const element = elementRef.current
    element.addEventListener('pointermove', handlePointerMove)
    return () => {
      element.removeEventListener('pointermove', handlePointerMove)
    }
  }, [elementRef, handlePointerMove])
}
