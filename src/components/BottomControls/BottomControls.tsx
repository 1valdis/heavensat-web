import { FC, memo, useCallback } from 'react'
import { FormControl, IconButton, Input, InputAdornment, InputLabel, Stack } from '@mui/material'
import { Add, Pause, PlayArrow, Remove } from '@mui/icons-material'
import { DateTime, DurationLikeObject } from 'luxon'
import { Location } from '../common-types.js'

const makeIncrDectHandler = (duration: DurationLikeObject, zone: string) => {
  return (date: Date, setDate: (date: Date) => void) => DateTime.fromJSDate(date, { zone }).plus(duration).toJSDate()
}

const BottomControlsFC: FC<{
  start: () => void
  stop: () => void
  isPlaying: boolean
  date: Date,
  setDate: (date: Date) => void
  zone: string
  location: Location
}> = ({
  start,
  stop,
  isPlaying,
  date,
  setDate,
  zone,
  location
}) => {
  const dateTime = DateTime.fromJSDate(date, { zone })

  const incrDay = useCallback(() => {
    setDate(makeIncrDectHandler({ days: 1 }, zone)(date, setDate))
  }, [date, setDate, zone])

  const decrDay = useCallback(() => {
    setDate(makeIncrDectHandler({ days: -1 }, zone)(date, setDate))
  }, [date, setDate, zone])

  const incrHour = useCallback(() => {
    setDate(makeIncrDectHandler({ hours: 1 }, zone)(date, setDate))
  }, [date, setDate, zone])

  const decrHour = useCallback(() => {
    setDate(makeIncrDectHandler({ hours: -1 }, zone)(date, setDate))
  }, [date, setDate, zone])

  const incrMinute = useCallback(() => {
    setDate(makeIncrDectHandler({ minutes: 1 }, zone)(date, setDate))
  }, [date, setDate, zone])

  const decrMinute = useCallback(() => {
    setDate(makeIncrDectHandler({ minutes: -1 }, zone)(date, setDate))
  }, [date, setDate, zone])

  const incrSecond = useCallback(() => {
    setDate(makeIncrDectHandler({ seconds: 1 }, zone)(date, setDate))
  }, [date, setDate, zone])

  const decrSecond = useCallback(() => {
    setDate(makeIncrDectHandler({ seconds: -1 }, zone)(date, setDate))
  }, [date, setDate, zone])

  const incrMillisecond = useCallback(() => {
    setDate(makeIncrDectHandler({ milliseconds: 1 }, zone)(date, setDate))
  }, [date, setDate, zone])

  const decrMillisecond = useCallback(() => {
    setDate(makeIncrDectHandler({ milliseconds: -1 }, zone)(date, setDate))
  }, [date, setDate, zone])

  return (
    <div style={{ display: 'grid', placeItems: 'center center' }}>
      <Stack direction='row' useFlexGap spacing={1} mt='1ch' justifyItems='center'>
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
      </Stack>
    </div>
  )
}

export const BottomControls = memo(BottomControlsFC)
