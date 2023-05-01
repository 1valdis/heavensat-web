import * as satellite from 'satellite.js'
import { WorkerAnswer, WorkerQuery } from './message-types'
import { MsdfGeometry, MsdfGeometryBuilder } from './msdf'

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

const geometriesMap = new Map<string, MsdfGeometry>()

self.onmessage = (e: MessageEvent<WorkerQuery>) => {
  if (e.data.type === 'init') {
    geometriesMap.clear()
    const geometryBuilder = new MsdfGeometryBuilder(e.data.msdfDefinition)
    satRecs = e.data['3LEs']
      .map(tle => {
        const satRec = satellite.twoline2satrec(tle[1], tle[2])
        geometriesMap.set(satRec.satnum, geometryBuilder.textToGeometry(tle[0].slice(2)))
        return satRec
      })
      .filter(satRec => satRec.error === 0)
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

    const successful = (positions.filter((position) => position.cartesian) as {norad: string, cartesian: [number, number, number]}[]).filter(position => position.cartesian[1] > 0)
    const positionsArray = new Float32Array(successful.flatMap(position => position.cartesian!))

    const textsOrigins = new Float32Array(successful.flatMap(satellite => geometriesMap.get(satellite.norad)!.chars.flatMap(() => Array.from({ length: 6 }, () => satellite.cartesian).flat())))
    const textsPositions = new Float32Array(successful.flatMap(satellite => geometriesMap.get(satellite.norad)!.chars.flatMap(char => [
      char.iXY[0], char.iXY[1],
      char.iXY[0] + char.iSize[0], char.iXY[1],
      char.iXY[0] + char.iSize[0], char.iXY[1] + char.iSize[1],
      char.iXY[0], char.iXY[1],
      char.iXY[0], char.iXY[1] + char.iSize[1],
      char.iXY[0] + char.iSize[0], char.iXY[1] + char.iSize[1]
    ])))
    const textsUVCoords = new Float32Array(successful.flatMap(satellite => geometriesMap.get(satellite.norad)!.chars.flatMap(char => [
      char.iUV[0], char.iUV[1],
      char.iUV[0] + char.iSize[0], char.iUV[1],
      char.iUV[0] + char.iSize[0], char.iUV[1] + char.iSize[1],
      char.iUV[0], char.iUV[1],
      char.iUV[0], char.iUV[1] + char.iSize[1],
      char.iUV[0] + char.iSize[0], char.iUV[1] + char.iSize[1]
    ])))
    // eslint-disable-next-line no-debugger

    typedPostMessage({
      type: 'process',
      result: {
        failedNorads: positions.filter((position) => !position.cartesian).map(position => position.norad),
        propagatedPositions: positionsArray,
        textsOrigins,
        textsPositions,
        textsUVCoords
      },
      queryId
    // idk why typescript thinks I can't transfer an ArrayBuffer??
    // @ts-expect-error Type 'ArrayBufferLike[]' has no properties in common with type 'WindowPostMessageOptions'.
    }, [positionsArray.buffer, textsOrigins.buffer, textsPositions.buffer, textsUVCoords.buffer])
  }
}
