import { FC, useCallback, useRef } from 'react'
import { Location } from '../App/common-types'

import './Menu.css'
import { DateTime } from 'luxon'

export interface MenuProps {
  date: Date
  setDate: (date: Date) => void
  location: Location
  setLocation: (location: Location) => void
  startRealtime: () => void
  stopRealtime: () => void
  isRealtime: boolean
  switchSatelliteNamesVisibility: () => void
  satelliteNamesVisible: boolean
  selectedStarId: number | null
}

export const Menu: FC<MenuProps> = ({ date, setDate, setLocation, startRealtime, stopRealtime, isRealtime, switchSatelliteNamesVisibility, satelliteNamesVisible, selectedStarId }) => {
  const updateLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude ?? 0
      })
    )
  }, [setLocation])

  const yearInputRef = useRef<HTMLInputElement>(null)
  const monthInputRef = useRef<HTMLInputElement>(null)
  const dayInputRef = useRef<HTMLInputElement>(null)
  const hourInputRef = useRef<HTMLInputElement>(null)
  const minuteInputRef = useRef<HTMLInputElement>(null)
  const secondInputRef = useRef<HTMLInputElement>(null)
  const millisecondInputRef = useRef<HTMLInputElement>(null)

  const dateTime = DateTime.fromJSDate(date).setZone('system')

  const changeDate = useCallback(() => {
    const newDateTime = DateTime.fromObject({
      year: +yearInputRef.current!.value,
      month: +monthInputRef.current!.value,
      day: +dayInputRef.current!.value,
      hour: +hourInputRef.current!.value,
      minute: +minuteInputRef.current!.value,
      second: +secondInputRef.current!.value,
      millisecond: +millisecondInputRef.current!.value
    }, { zone: 'system' })
    if (!newDateTime.isValid) return
    setDate(newDateTime.toJSDate())
  }, [setDate])

  return <nav>
    <label>{date.toISOString()}</label>
    <button onClick={updateLocation}>Locate</button>
    <button onClick={() => isRealtime ? stopRealtime() : startRealtime()}>{isRealtime ? 'Stop' : 'Start'}</button>
    <form onChange={() => changeDate()}>
      <input ref={yearInputRef} type='number' min={2000} max={2100} value={dateTime.year}></input>
      <input ref={monthInputRef} type='number' min={1} max={12} value={`${dateTime.month}`.padStart(2, '0')}></input>
      <input ref={dayInputRef} type='number' min={1} max={dateTime.endOf('month').day} value={dateTime.day}></input>
      <input ref={hourInputRef} type='number' min={0} max={23} value={`${dateTime.hour}`.padStart(2, '0')}></input>
      <input ref={minuteInputRef} type='number' min={0} max={59} value={`${dateTime.minute}`.padStart(2, '0')}></input>
      <input ref={secondInputRef} type='number' min={0} max={59} value={`${dateTime.second}`.padStart(2, '0')}></input>
      <input ref={millisecondInputRef} type='number' min={0} max={999} value={`${dateTime.millisecond}`.padStart(3, '0')}></input>
    </form>
    <label><input type='checkbox' onChange={switchSatelliteNamesVisibility} checked={satelliteNamesVisible}></input>Satellite names</label>
    <p>Selected star: {selectedStarId ?? 'Not selected' }</p>
  </nav>
}
