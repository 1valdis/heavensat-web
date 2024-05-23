import { FC, useCallback } from 'react'
import { Location } from '../App/common-types'

import './Menu.css'

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
  const incrementDate = useCallback(() => {
    const newDate = new Date(date)
    newDate.setTime(newDate.getTime() + 1000)
    setDate(newDate)
  }, [date, setDate])
  const decrementDate = useCallback(() => {
    const newDate = new Date(date)
    newDate.setTime(newDate.getTime() - 1000)
    setDate(newDate)
  }, [date, setDate])
  const updateLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude ?? 0
      })
    )
  }, [setLocation])
  return <nav>
    <label>{date.toISOString()}</label>
    <button onClick={incrementDate}>+1s</button>
    <button onClick={decrementDate}>-1s</button>
    <button onClick={updateLocation}>Locate</button>
    <button onClick={() => isRealtime ? stopRealtime() : startRealtime()}>{isRealtime ? 'Stop' : 'Start'}</button>
    <label><input type='checkbox' onChange={switchSatelliteNamesVisibility} checked={satelliteNamesVisible}></input>Satellite names</label>
    <p>Selected star: {selectedStarId ?? 'Not selected' }</p>
  </nav>
}
