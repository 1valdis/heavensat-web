import * as satellite from 'satellite.js'
import { WorkerAnswer, WorkerQuery } from './message-types'
import { MsdfGeometry, MsdfGeometryBuilder } from './msdf'

const VERTICES_PER_QUAD = 6
const FLOATS_PER_ORIGIN = 3
const FLOATS_PER_POSITION = 2
const FLOATS_PER_UV = 2
const FLOATS_PER_VERTEX = FLOATS_PER_POSITION + FLOATS_PER_ORIGIN + FLOATS_PER_UV

function lookAnglesToCartesian (elevation: number, azimuth: number): [number, number, number] {
  const x = Math.cos(elevation) * Math.cos(azimuth)
  const y = -Math.cos(elevation) * Math.sin(azimuth)
  const z = Math.sin(elevation)

  return [y, z, x]
}

function concat (arrays: Float32Array[]): Float32Array
function concat (arrays: Int32Array[]): Int32Array
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

type ParametersExceptFirst<F> =
   F extends (arg0: any, ...rest: infer R) => any ? R : never

function typedPostMessage (message: WorkerAnswer, ...rest: ParametersExceptFirst<typeof postMessage>) {
  postMessage(message, ...rest)
}

let satRecs: satellite.SatRec[] = []

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
        noradToIdMap.set(satRec.satnum, ids[index]!)
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

    const successful = (positions.filter((position) => position.cartesian) as { norad: string, cartesian: [number, number, number] }[])
      .filter(position => position.cartesian[1] > 0)
    const positionsArray = concat(successful.map(position => new Float32Array(position.cartesian!)))
    const idsArray = concat(successful.map(position => new Int32Array([noradToIdMap.get(position.norad)!])))

    const totalSymbols = successful.reduce((acc, sat) => acc + geometriesMap.get(sat.norad)!.chars.length, 0)
    const length = FLOATS_PER_VERTEX * VERTICES_PER_QUAD * totalSymbols
    const interleavedTexts = new Float32Array(length)

    const originOffset = FLOATS_PER_POSITION
    const uvOffset = originOffset + FLOATS_PER_ORIGIN
    for (let satI = 0, totalSymbolI = 0; satI < successful.length; satI++) {
      const sat = successful[satI]!
      const geometry = geometriesMap.get(sat.norad)
      const geometryPositionMap = geometriesPositionsMap.get(sat.norad)!
      const geometryUVCoords = geometriesUVCoordsMap.get(sat.norad)!
      for (let symbolWithinNameI = 0; symbolWithinNameI < geometry!.chars.length; symbolWithinNameI++) {
        const startingOffsetOfSymbol = (totalSymbolI + symbolWithinNameI) * FLOATS_PER_VERTEX * VERTICES_PER_QUAD
        for (let vertexOfQuad = 0; vertexOfQuad < VERTICES_PER_QUAD; vertexOfQuad++) {
          const vertexWithOffsets = startingOffsetOfSymbol + vertexOfQuad * FLOATS_PER_VERTEX
          // 7 numbers per vertex: 2 for position, 3 for origin, 2 for uv
          interleavedTexts[vertexWithOffsets] = geometryPositionMap[symbolWithinNameI * VERTICES_PER_QUAD * FLOATS_PER_POSITION + vertexOfQuad * FLOATS_PER_POSITION]!
          interleavedTexts[vertexWithOffsets + 1] = geometryPositionMap[symbolWithinNameI * VERTICES_PER_QUAD * FLOATS_PER_POSITION + vertexOfQuad * FLOATS_PER_POSITION + 1]!
          interleavedTexts[vertexWithOffsets + originOffset] = sat.cartesian[0]!
          interleavedTexts[vertexWithOffsets + originOffset + 1] = sat.cartesian[1]!
          interleavedTexts[vertexWithOffsets + originOffset + 2] = sat.cartesian[2]!
          interleavedTexts[vertexWithOffsets + uvOffset] = geometryUVCoords[symbolWithinNameI * VERTICES_PER_QUAD * FLOATS_PER_UV + vertexOfQuad * FLOATS_PER_UV]!
          interleavedTexts[vertexWithOffsets + uvOffset + 1] = geometryUVCoords[symbolWithinNameI * VERTICES_PER_QUAD * FLOATS_PER_UV + vertexOfQuad * FLOATS_PER_UV + 1]!
        }
      }
      totalSymbolI += geometry!.chars.length
    }

    typedPostMessage({
      type: 'process',
      result: {
        failedNorads: positions.filter((position) => !position.cartesian).map(position => position.norad),
        propagatedPositions: positionsArray,
        propagatedIds: idsArray,
        texts: interleavedTexts,
      },
      queryId
    // idk why typescript thinks I can't transfer an ArrayBuffer??
    // @ts-expect-error Type 'ArrayBufferLike[]' has no properties in common with type 'WindowPostMessageOptions'.
    }, [positionsArray.buffer, interleavedTexts.buffer])
  }
}
