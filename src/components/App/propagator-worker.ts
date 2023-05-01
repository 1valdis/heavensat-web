import * as satellite from 'satellite.js'
import { WorkerAnswer, WorkerQuery } from './message-types'
import { MsdfGeometry, MsdfGeometryBuilder } from './msdf'

function lookAnglesToCartesian (elevation: number, azimuth: number): [number, number, number] {
  const x = Math.cos(elevation) * Math.cos(azimuth)
  const y = -Math.cos(elevation) * Math.sin(azimuth)
  const z = Math.sin(elevation)

  return [y, z, x]
}

function concat (arrays: Float32Array[]) {
  const totalLength = arrays.reduce((acc, value) => acc + value.length, 0)

  const result = new Float32Array(totalLength)

  let length = 0
  for (const array of arrays) {
    result.set(array, length)
    length += array.length
  }

  return result
}

function duplicate (array: Float32Array, times: number) {
  const newLength = array.length * times

  const result = new Float32Array(newLength)

  for (let i = 0; i < times; i++) {
    result.set(array, i * array.length)
  }

  return result
}

type ParametersExceptFirst<F> =
   F extends (arg0: any, ...rest: infer R) => any ? R : never;

function typedPostMessage (message: WorkerAnswer, ...rest: ParametersExceptFirst<typeof postMessage>) {
  postMessage(message, ...rest)
}

let satRecs: satellite.SatRec[] = []

const geometriesMap = new Map<string, MsdfGeometry>()
const geometriesPositionsMap = new Map<string, Float32Array>()
const geometriesUVCoordsMap = new Map<string, Float32Array>()

self.onmessage = (e: MessageEvent<WorkerQuery>) => {
  if (e.data.type === 'init') {
    geometriesMap.clear()
    geometriesPositionsMap.clear()
    geometriesUVCoordsMap.clear()
    const geometryBuilder = new MsdfGeometryBuilder(e.data.msdfDefinition)
    satRecs = e.data['3LEs']
      .map(tle => {
        const satRec = satellite.twoline2satrec(tle[1], tle[2])
        const geometry = geometryBuilder.textToGeometry(tle[0].slice(2))
        geometriesMap.set(satRec.satnum, geometry)
        geometriesPositionsMap.set(satRec.satnum, new Float32Array(geometry.chars.flatMap(char => [
          char.iXY[0], char.iXY[1],
          char.iXY[0] + char.iSize[0], char.iXY[1],
          char.iXY[0] + char.iSize[0], char.iXY[1] + char.iSize[1],
          char.iXY[0], char.iXY[1],
          char.iXY[0], char.iXY[1] + char.iSize[1],
          char.iXY[0] + char.iSize[0], char.iXY[1] + char.iSize[1]
        ])))
        geometriesUVCoordsMap.set(satRec.satnum, new Float32Array(geometry.chars.flatMap(char => [
          char.iUV[0], char.iUV[1],
          char.iUV[0] + char.iSize[0], char.iUV[1],
          char.iUV[0] + char.iSize[0], char.iUV[1] + char.iSize[1],
          char.iUV[0], char.iUV[1],
          char.iUV[0], char.iUV[1] + char.iSize[1],
          char.iUV[0] + char.iSize[0], char.iUV[1] + char.iSize[1]
        ])))
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
    const positionsArray = concat(successful.map(position => new Float32Array(position.cartesian!)))

    const textsOrigins = concat(
      successful.map(
        satellite => duplicate(new Float32Array(satellite.cartesian), 6 * geometriesMap.get(satellite.norad)!.chars.length)
      )
    )
    const textsPositions = concat(successful.map(satellite => geometriesPositionsMap.get(satellite.norad)!))
    const textsUVCoords = concat(successful.map(satellite => geometriesUVCoordsMap.get(satellite.norad)!))
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
