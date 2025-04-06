import { OMMJsonObject } from 'satellite.js'

export type Viewport = { x: number, y: number }
export type Panning = { x: number, y: number }
// lat, lon in degrees, altitude in m asl
export type Location = { latitude: number, longitude: number, altitude: number, timezone: string }
export type Satellite = {
  name: string
  norad: string
  omm: OMMJsonObject
}
export type PropagatedSatellite = {
  norad: string
  cartesian: [number, number, number] | null
}
export type HIPStarOriginal = [number, number, number, number, number]
export type HIPStar = {
  id: number,
  raDec: [number, number],
  bv: number,
  mag: number
}
