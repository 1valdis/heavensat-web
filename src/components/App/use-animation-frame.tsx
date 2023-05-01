import { useCallback, useEffect, useRef, useState } from 'react'

export type Controls = {
  isStopped: boolean
  stop: () => void
  start: () => void
}

type AnimationFrameLoopOptions = {
  startOnMount?: boolean
}

type AnimationFrameHandle = ReturnType<typeof requestAnimationFrame>

const useAnimationFrame = <T extends (...args: never[]) => unknown>(
  callback: T
): ((...args: Parameters<T>) => number) => {
  const rafCallback = useRef<T>(callback)
  const handleRef = useRef<AnimationFrameHandle | null>(null)

  useEffect(() => {
    rafCallback.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (handleRef.current) {
        cancelAnimationFrame(handleRef.current)
      }
    }
  }, [])

  return useCallback<(...args: Parameters<T>) => number>(
    (...args: Parameters<T>) => {
      handleRef.current = requestAnimationFrame(() =>
        rafCallback.current(...args)
      )
      return handleRef.current
    },
  []
  )
}

export const useAnimationFrameLoop = <T extends (...args: never[]) => unknown>(
  callback: T,
  options: AnimationFrameLoopOptions = {}
): Controls => {
  const { startOnMount = false } = options
  const rafCallback = useRef<T>(callback)

  const [isStopped, setIsStopped] = useState(!startOnMount)

  const stop = useCallback(() => {
    setIsStopped(true)
  }, [setIsStopped])

  const start = useCallback(() => {
    setIsStopped(false)
  }, [setIsStopped])

  useEffect(() => {
    rafCallback.current = callback
  }, [callback])

  const nextCallback = useCallback(() => {
    if (!isStopped) {
      rafCallback.current()
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      runInLoop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStopped])

  const runInLoop = useAnimationFrame(nextCallback)

  useEffect(() => {
    if (!isStopped) {
      const h = runInLoop()
      return () => {
        cancelAnimationFrame(h)
      }
    }
    return () => {}
  }, [runInLoop, isStopped])

  return {
    start,
    stop,
    isStopped
  }
}

export default useAnimationFrameLoop
