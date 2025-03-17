import { Dispatch, useCallback, useReducer } from 'react'
import useAnimationFrameLoop from '../Scene/use-animation-frame'
import { DateTime, DurationLikeObject } from 'luxon'

export enum TimeActions {
  SET, UPDATE_REALTIME, MODIFY_BY_DURATION, SET_TIMEZONE, UPDATE_OFFSET,
}

type Action = {
  type: TimeActions.SET,
  date: Date,
} | {
  type: TimeActions.MODIFY_BY_DURATION,
  duration: DurationLikeObject
} | {
  type: TimeActions.UPDATE_REALTIME,
} | {
  type: TimeActions.SET_TIMEZONE,
  timezone: string,
} | {
  type: TimeActions.UPDATE_OFFSET,
}

function timeReducer (
  state: { date: Date, offsetMs: number, timezone: string },
  action: Action
): { date: Date, offsetMs: number, timezone: string } {
  const { date, timezone, offsetMs } = state

  switch (action.type) {
    case TimeActions.MODIFY_BY_DURATION:
    {
      const newDateTime = DateTime.fromJSDate(date, { zone: timezone }).plus(action.duration)
      return {
        date: newDateTime.toJSDate(),
        offsetMs: +newDateTime - +new Date(),
        timezone,
      }
    }
    case TimeActions.UPDATE_REALTIME:
      return {
        date: new Date(+new Date() + offsetMs),
        offsetMs,
        timezone,
      }
    case TimeActions.SET:
      return { date: action.date, timezone, offsetMs: +action.date - +new Date() }
    case TimeActions.SET_TIMEZONE: {
      return {
        date,
        offsetMs,
        timezone: action.timezone,
      }
    }
    case TimeActions.UPDATE_OFFSET:
      return {
        date,
        offsetMs: +date - +new Date(),
        timezone,
      }
  }
}

export type DispatchTimeAction = Dispatch<Action>

export type TimeControls = {
  start: () => void,
  stop: () => void,
  isPlaying: boolean,
  date: Date,
  dispatch: DispatchTimeAction,
}

export const useTimeControls = (timeZone: string): TimeControls => {
  const [state, dispatch] = useReducer(timeReducer, {
    date: new Date(),
    offsetMs: 0,
    timezone: timeZone,
  })

  if (state.timezone !== timeZone) {
    dispatch({ type: TimeActions.SET_TIMEZONE, timezone: timeZone })
  }

  const { start, stop, isStopped } = useAnimationFrameLoop(
    () => { dispatch({ type: TimeActions.UPDATE_REALTIME }) }, { startOnMount: true }
  )

  const play = useCallback(() => {
    dispatch({ type: TimeActions.UPDATE_OFFSET })
    start()
  }, [start])

  return {
    date: state.date,
    start: play,
    stop,
    isPlaying: !isStopped,
    dispatch,
  }
}
