/* eslint-disable no-redeclare */
import * as ootk from 'ootk'
import * as satellite from 'satellite.js'
import { WorkerAnswer, WorkerQuery } from '../message-types'
import { MsdfGeometry, MsdfGeometryBuilder } from '../msdf'

function lookAnglesToCartesian (elevation: number, azimuth: number): [number, number, number] {
  const x = Math.cos(elevation) * Math.cos(azimuth)
  const y = -Math.cos(elevation) * Math.sin(azimuth)
  const z = Math.sin(elevation)

  return [y, z, x]
}

function concat (arrays: Float32Array[]): Float32Array;
function concat (arrays: Int32Array[]): Int32Array;
function concat (arrays: Float32Array[] | Int32Array[]): Float32Array | Int32Array {
  const totalLength = arrays.reduce((acc, value) => acc + value.length, 0)

  const result = arrays[0]! instanceof Float32Array ? new Float32Array(totalLength) : new Int32Array(totalLength)

  let length = 0
  for (const array of arrays) {
    result.set(array, length)
    length += array.length
  }

  return result
}

// fast duplicate of Float32Array, useful for same data for multiple vertices
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

let satRecs: ootk.Satellite[] = []

const noradToIdMap = new Map<string, number>()

const geometriesMap = new Map<string, MsdfGeometry>()
const geometriesPositionsMap = new Map<string, Float32Array>()
const geometriesUVCoordsMap = new Map<string, Float32Array>()

self.onmessage = (e: MessageEvent<WorkerQuery>) => {
  if (e.data.type === 'init') {
    const ids = e.data.ids
    if (ids.length !== e.data['3LEs'].length) {
      throw new Error('Ids must match 3LEs in length')
    }
    geometriesMap.clear()
    geometriesPositionsMap.clear()
    geometriesUVCoordsMap.clear()
    noradToIdMap.clear()
    const geometryBuilder = new MsdfGeometryBuilder(e.data.msdfDefinition)
    satRecs = e.data['3LEs']
      .map((tle, index) => {
        const name = tle[0].slice(2)
        const satRec = new ootk.Satellite({ name, tle1: tle[1] as ootk.TleLine1, tle2: tle[2] as ootk.TleLine2 })
        const geometry = geometryBuilder.textToGeometry(name)
        geometriesMap.set(satRec.satrec.satnum, geometry)
        geometriesPositionsMap.set(satRec.satrec.satnum, new Float32Array(geometry.chars.flatMap(char => [
          char.iXY[0], char.iXY[1],
          char.iXY[0] + char.iSize[0], char.iXY[1],
          char.iXY[0] + char.iSize[0], char.iXY[1] + char.iSize[1],
          char.iXY[0], char.iXY[1],
          char.iXY[0], char.iXY[1] + char.iSize[1],
          char.iXY[0] + char.iSize[0], char.iXY[1] + char.iSize[1]
        ])))
        geometriesUVCoordsMap.set(satRec.satrec.satnum, new Float32Array(geometry.chars.flatMap(char => [
          char.iUV[0], char.iUV[1],
          char.iUV[0] + char.iSize[0], char.iUV[1],
          char.iUV[0] + char.iSize[0], char.iUV[1] + char.iSize[1],
          char.iUV[0], char.iUV[1],
          char.iUV[0], char.iUV[1] + char.iSize[1],
          char.iUV[0] + char.iSize[0], char.iUV[1] + char.iSize[1]
        ])))
        noradToIdMap.set(satRec.satrec.satnum, ids[index]!)
        return satRec
      })
      .filter(satRec => satRec.satrec.error === 0)
    typedPostMessage({
      type: 'init',
      message: 'ok',
      queryId: e.data.queryId
    })
  } else if (e.data.type === 'process') {
    const { date, location, queryId } = e.data

    const sensor = new ootk.Sensor({
      alt: location.altitude as ootk.Kilometers,
      lat: location.latitude as ootk.Degrees,
      lon: location.longitude as ootk.Degrees,
      maxAz: 360 as ootk.Degrees,
      maxEl: 180 as ootk.Degrees,
      maxRng: Infinity as ootk.Kilometers,
      minAz: 0 as ootk.Degrees,
      minEl: 0 as ootk.Degrees,
      minRng: 0 as ootk.Kilometers,
    })

    const kek = performance.now()
    const positions = satRecs.map((satRec) => {
      const rae = sensor.rae(satRec, date)
      return {
        norad: satRec.satrec.satnum,
        cartesian: lookAnglesToCartesian(satellite.degreesToRadians(rae.el), satellite.degreesToRadians(rae.az))
      }
    })
    console.log(performance.now() - kek)

    const successful = (positions.filter((position) => position.cartesian) as {norad: string, cartesian: [number, number, number]}[])
      .filter(position => position.cartesian[1] > 0)
    const positionsArray = concat(successful.map(position => new Float32Array(position.cartesian!)))
    const idsArray = concat(successful.map(position => new Int32Array([noradToIdMap.get(position.norad)!])))

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
        propagatedIds: idsArray,
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
