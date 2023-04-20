export type Viewport = {x: number, y: number}
export type Panning = {x: number, y: number}
export type Location = {latitude: number, longitude: number, altitude: number}
export type Satellite = {
  name: string
  norad: string
  tleLines: [string, string]
}
export type PropagatedSatellite = {
  norad: string
  cartesian: [number, number, number] | null
}
