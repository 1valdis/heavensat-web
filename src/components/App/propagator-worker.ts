import * as satellite from 'satellite.js'
import { WorkerAnswer, WorkerQuery } from './message-types'

function lookAnglesToCartesian (elevation: number, azimuth: number): [number, number, number] {
  const x = Math.cos(elevation) * Math.cos(azimuth)
  const y = -Math.cos(elevation) * Math.sin(azimuth)
  const z = Math.sin(elevation)

  return [y, z, x]
}

type ParametersExceptFirst<F> =
   F extends (arg0: any, ...rest: infer R) => any ? R : never;

function typedPostMessage (message: WorkerAnswer, ...rest: ParametersExceptFirst<typeof postMessage>) {
  postMessage(message, ...rest)
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

    const positions = satRecs.map((satRec) => {
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
    })

    const positionsArray = new Float32Array(positions.filter(position => position.cartesian).flatMap(position => position.cartesian!))

    typedPostMessage({
      type: 'process',
      result: {
        failedNorads: positions.filter((position) => !position.cartesian).map(position => position.norad),
        positionsOfTheRest: positionsArray
      },
      queryId
    // idk why typescript thinks I can't transfer an ArrayBuffer??
    // @ts-expect-error Type 'ArrayBufferLike[]' has no properties in common with type 'WindowPostMessageOptions'.
    }, [positionsArray.buffer])
  }
}
