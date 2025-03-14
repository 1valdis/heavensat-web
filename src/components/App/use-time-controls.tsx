import { useCallback, useState } from 'react'
import useAnimationFrameLoop from '../Scene/use-animation-frame'

export type TimeControls = {
  start: () => void,
  stop: () => void,
  isPlaying: boolean,
  setDate: (date: Date) => void,
  date: Date,
}

export const useTimeControls = (): TimeControls => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [offsetMilliseconds, setOffsetMilliseconds] = useState(+currentDate - +new Date())
  const { start, stop, isStopped } = useAnimationFrameLoop(
    () => { setCurrentDate(new Date(+new Date() + offsetMilliseconds)) }, { startOnMount: false }
  )

  const play = useCallback(() => {
    setOffsetMilliseconds(+currentDate - +new Date())
    start()
  }, [currentDate, start])

  const setDate = useCallback((date: Date) => {
    setCurrentDate(date)
    setOffsetMilliseconds(+date - +new Date())
  }, [])

  return {
    date: currentDate,
    start: play,
    stop,
    isPlaying: !isStopped,
    setDate
  }
}
