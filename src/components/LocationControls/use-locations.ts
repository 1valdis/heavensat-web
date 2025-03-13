import { useReducer } from 'react'
import { Location } from '../common-types.js'

export const DeviceLocation = Symbol('DEVICE')
export const ZeroLocation = Symbol('ZERO')

type ExtendedLocation = ({ id: string, name: string }
  & Location)

type State = { locations: ExtendedLocation[], selected: string | typeof DeviceLocation | typeof ZeroLocation }
type Action = { type: 'SET_DEVICE' }
  | { type: 'ADD', location: Location & { name: string } }
  | { type: 'DELETE', id: string }
  | { type: 'SET_CUSTOM', id: string }

const locationsReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_DEVICE':
      return { ...state, selected: DeviceLocation }
    case 'SET_CUSTOM':
      return { ...state, selected: action.id }
    case 'ADD': {
      const id = crypto.randomUUID()
      return {
        ...state,
        locations: [...state.locations, { id, ...action.location }],
        selected: id
      }
    }
    case 'DELETE': {
      const newLocations = state.locations.filter(l => l.id !== action.id)
      let selected = state.selected
      if (selected === action.id) {
        if (newLocations[0]) {
          selected = newLocations[0].id
        } else {
          selected = ZeroLocation
        }
      }
      return { locations: newLocations, selected }
    }
  }
}

const storedLocations = localStorage.getItem('locationsState')
const parsedState = storedLocations ? JSON.parse(storedLocations) : { locations: [], selected: ZeroLocation }
const initialState: State = {
  ...parsedState,
  selected: parsedState.selected ?? ZeroLocation
}

export const useLocations = () => {
  const [state, dispatch] = useReducer(locationsReducer, initialState)
  return [state, dispatch] as const
}
