import { FC, useCallback } from 'react'
import { Button, FormControl, IconButton, Input, InputAdornment, InputLabel, Stack } from '@mui/material'
import { Add, Pause, PlayArrow, Remove } from '@mui/icons-material'
import { DateTime, Duration, DurationLikeObject } from 'luxon'
import { useHotkey } from '../use-hotkey.js'
import { DispatchTimeAction, TimeActions } from '../App/use-time-controls.js'

export const TimeControls: FC<{
  start: () => void
  stop: () => void
  isPlaying: boolean
  date: Date,
  dispatch: DispatchTimeAction
  hotkeyStep: DurationLikeObject
  zone: string
}> = ({
  start,
  stop,
  isPlaying,
  date,
  dispatch,
  hotkeyStep,
  zone
}) => {
  const dateTime = DateTime.fromJSDate(date, { zone })

  const incrDay = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: { days: 1 }
    })
  }, [dispatch])

  const decrDay = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: { days: -1 }
    })
  }, [dispatch])

  const incrHour = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: { hours: 1 }
    })
  }, [dispatch])

  const decrHour = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: { hours: -1 }
    })
  }, [dispatch])

  const incrMinute = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: { minutes: 1 }
    })
  }, [dispatch])

  const decrMinute = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: { minutes: -1 }
    })
  }, [dispatch])

  const incrSecond = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: { seconds: 1 }
    })
  }, [dispatch])

  const decrSecond = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: { seconds: -1 }
    })
  }, [dispatch])

  const incrMillisecond = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: { milliseconds: 1 }
    })
  }, [dispatch])

  const decrMillisecond = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: { milliseconds: -1 }
    })
  }, [dispatch])

  const setDate = useCallback((newDate: Date) => {
    dispatch({
      type: TimeActions.SET,
      date: newDate
    })
  }, [dispatch])

  const incrFromHotkey = useCallback(() => {
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: hotkeyStep,
    })
  }, [dispatch, hotkeyStep])

  const decrFromHotkey = useCallback(() => {
    const negatedHotkeyStep = Duration.fromDurationLike(hotkeyStep).negate().toObject()
    dispatch({
      type: TimeActions.MODIFY_BY_DURATION,
      duration: negatedHotkeyStep,
    })
  }, [dispatch, hotkeyStep])

  useHotkey('ArrowRight', incrFromHotkey)
  useHotkey('ArrowLeft', decrFromHotkey)

  return (
    <Stack direction='row' useFlexGap spacing={1} justifyItems='center' alignContent='center'>
      <FormControl sx={{ width: '23ch' }} size='small'>
        <InputLabel htmlFor='date-input' size='small'>Date</InputLabel>
        <Input
          id='date-input' type='date' size='small' startAdornment={
            <InputAdornment position='start'>
              <IconButton size='small' onClick={decrDay} aria-label='Decrement date by one day'><Remove /></IconButton>
            </InputAdornment>
      } endAdornment={
        <InputAdornment position='end'>
          <IconButton size='small' onClick={incrDay} aria-label='Increment date by one day'><Add /></IconButton>
        </InputAdornment>
      } value={dateTime.toISODate()}
        />
      </FormControl>
      <FormControl sx={{ width: '13ch' }} size='small'>
        <InputLabel htmlFor='hour-input' size='small'>Hour</InputLabel>
        <Input
          id='hour-input' size='small' type='text' startAdornment={
            <InputAdornment position='start'>
              <IconButton size='small' onClick={decrHour} aria-label='Decrement hour'><Remove /></IconButton>
            </InputAdornment>
      } endAdornment={
        <InputAdornment position='end'>
          <IconButton size='small' onClick={incrHour} aria-label='Increment hour'><Add /></IconButton>
        </InputAdornment>
      } value={dateTime.hour}
        />
      </FormControl>
      <FormControl sx={{ width: '13ch' }} size='small'>
        <InputLabel htmlFor='minute-input' size='small'>Minute</InputLabel>
        <Input
          id='minute-input' size='small' type='text' startAdornment={
            <InputAdornment position='start'>
              <IconButton size='small' onClick={decrMinute} aria-label='Decrement minute'><Remove /></IconButton>
            </InputAdornment>
      } endAdornment={
        <InputAdornment position='end'>
          <IconButton size='small' onClick={incrMinute} aria-label='Increment minute'><Add /></IconButton>
        </InputAdornment>
      } value={dateTime.minute}
        />
      </FormControl>
      <FormControl sx={{ width: '13ch' }} size='small'>
        <InputLabel htmlFor='second-input' size='small'>Second</InputLabel>
        <Input
          id='second-input' size='small' type='text' startAdornment={
            <InputAdornment position='start'>
              <IconButton size='small' onClick={decrSecond} aria-label='Decrement second'><Remove /></IconButton>
            </InputAdornment>
      } endAdornment={
        <InputAdornment position='end'>
          <IconButton size='small' onClick={incrSecond} aria-label='Increment second'><Add /></IconButton>
        </InputAdornment>
      } value={dateTime.second}
        />
      </FormControl>
      <FormControl sx={{ width: '15ch' }} size='small'>
        <InputLabel htmlFor='millisecond-input' size='small'>Millisecond</InputLabel>
        <Input
          id='millisecond-input' size='small' type='text' startAdornment={
            <InputAdornment position='start'>
              <IconButton size='small' onClick={decrMillisecond} aria-label='Decrement millisecond'><Remove /></IconButton>
            </InputAdornment>
      } endAdornment={
        <InputAdornment position='end'>
          <IconButton size='small' onClick={incrMillisecond} aria-label='Increment millisecond'><Add /></IconButton>
        </InputAdornment>
      } value={dateTime.millisecond}
        />
      </FormControl>
      <IconButton size='large' aria-label={isPlaying ? 'Pause' : 'Play'} onClick={isPlaying ? stop : start}>
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>
      <Button variant='outlined' onClick={() => setDate(new Date())}>Now</Button>
    </Stack>
  )
}
