import { FC, useCallback } from 'react'
import { Location } from '../App/scene'

import './Menu.css'

export interface MenuProps {
  date: Date
  setDate: (date: Date) => void
  setLocation: (location: Location) => void
}

export const Menu: FC<MenuProps> = ({ date, setDate, setLocation }) => {
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
    <label style={{ color: 'white' }}>{date.toISOString()}</label>
    <button onClick={incrementDate}>+1s</button>
    <button onClick={decrementDate}>-1s</button>
    <button onClick={updateLocation}>Locate</button>
  </nav>
}
