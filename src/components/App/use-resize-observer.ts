import { useRef, useEffect, useLayoutEffect, RefObject } from 'react'

const useLatest = <T extends any>(current: T) => {
  const storedValue = useRef(current)
  useEffect(() => {
    storedValue.current = current
  })
  return storedValue
}

if (!('ResizeObserver' in window)) {
  alert('Please update your browser to use this app')
}

function createResizeObserver () {
  let ticking = false
  let allEntries: ResizeObserverEntry[] = []

  const callbacks: Map<any, Array<UseResizeObserverCallback>> = new Map()

  const observer = new ResizeObserver(
    (entries: ResizeObserverEntry[], obs: ResizeObserver) => {
      allEntries = allEntries.concat(entries)
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const triggered = new Set<Element>()
          Array.from(allEntries).forEach(entry => {
            if (triggered.has(entry.target)) return
            triggered.add(entry.target)
            const cbs = callbacks.get(entry.target)
            cbs?.forEach((cb) => cb(entry, obs))
          })
          allEntries = []
          ticking = false
        })
      }
      ticking = true
    }
  )

  return {
    observer,
    subscribe (target: HTMLElement, callback: UseResizeObserverCallback) {
      observer.observe(target)
      const cbs = callbacks.get(target) ?? []
      cbs.push(callback)
      callbacks.set(target, cbs)
    },
    unsubscribe (target: HTMLElement, callback: UseResizeObserverCallback) {
      const cbs = callbacks.get(target) ?? []
      if (cbs.length === 1) {
        observer.unobserve(target)
        callbacks.delete(target)
        return
      }
      const cbIndex = cbs.indexOf(callback)
      if (cbIndex !== -1) cbs.splice(cbIndex, 1)
      callbacks.set(target, cbs)
    }
  }
}

let _resizeObserver: ReturnType<typeof createResizeObserver>

const getResizeObserver = () =>
  !_resizeObserver
    ? (_resizeObserver = createResizeObserver())
    : _resizeObserver

export type UseResizeObserverCallback = (
  entry: ResizeObserverEntry,
  observer: ResizeObserver
) => any

function useResizeObserver<T extends HTMLElement> (
  target: RefObject<T> | T | null,
  callback: UseResizeObserverCallback
): ResizeObserver {
  const resizeObserver = getResizeObserver()
  const storedCallback = useLatest(callback)

  useLayoutEffect(() => {
    let didUnsubscribe = false
    const targetEl = target && 'current' in target ? target.current : target
    if (!targetEl) return () => {}

    function cb (entry: ResizeObserverEntry, observer: ResizeObserver) {
      if (didUnsubscribe) return
      storedCallback.current(entry, observer)
    }

    resizeObserver.subscribe(targetEl as HTMLElement, cb)

    return () => {
      didUnsubscribe = true
      resizeObserver.unsubscribe(targetEl as HTMLElement, cb)
    }
  }, [target, resizeObserver, storedCallback])

  return resizeObserver.observer
}

export default useResizeObserver
