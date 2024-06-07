export type Viewport = {x: number, y: number}
export type Panning = {x: number, y: number}
// lat, lon in degrees, altitude in m asl
export type Location = {latitude: number, longitude: number, altitude: number}
export type Satellite = {
  name: string
  norad: string
  '3leLines': [string, string, string]
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
