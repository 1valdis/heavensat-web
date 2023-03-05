import { useEffect, useRef } from 'react'

export const useLatest = <T extends any>(current: T) => {
  const storedValue = useRef(current)
  useEffect(() => {
    storedValue.current = current
  })
  return storedValue
}
