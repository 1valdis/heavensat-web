import { useEffect } from 'react'

export const useHotkey = (code: string, action: () => void) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.code === code) {
        action()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [action, code])
}
