import * as satellite from 'satellite.js'
import { WorkerAnswer, WorkerQuery } from './message-types'

function lookAnglesToCartesian (elevation: number, azimuth: number): [number, number, number] {
  const x = Math.cos(elevation) * Math.cos(azimuth)
  const y = -Math.cos(elevation) * Math.sin(azimuth)
  const z = Math.sin(elevation)

  return [y, z, x]
}

function typedPostMessage (message: WorkerAnswer, options?: Parameters<typeof postMessage>[1]) {
  postMessage(message, options)
}

let satRecs: satellite.SatRec[] = []

self.onmessage = (e: MessageEvent<WorkerQuery>) => {
  if (e.data.type === 'init') {
    satRecs = e.data.tles.map(tle => satellite.twoline2satrec(tle[0], tle[1])).filter(satRec => satRec.error === 0)
    typedPostMessage({
      type: 'init',
      message: 'ok',
      queryId: e.data.queryId
    })
  } else if (e.data.type === 'process') {
    const { date, location, queryId } = e.data
    const gmst = satellite.gstime(date)
    const locationForLib = {
      longitude: satellite.degreesToRadians(location.longitude),
      latitude: satellite.degreesToRadians(location.latitude),
      height: location.altitude / 1000
    }

    typedPostMessage({
      type: 'process',
      result: satRecs.map((satRec) => {
        const positionEci = satellite.propagate(satRec, date)
        if (typeof positionEci.position !== 'object') {
          return {
            cartesian: null,
            norad: satRec.satnum
          }
        }
        const positionEcf = satellite.eciToEcf(positionEci.position as satellite.EciVec3<number>, gmst)
        const lookAngles = satellite.ecfToLookAngles(locationForLib, positionEcf)
        return {
          norad: satRec.satnum,
          cartesian: lookAnglesToCartesian(lookAngles.elevation, lookAngles.azimuth)
        }
      }),
      queryId
    })
  }
}
