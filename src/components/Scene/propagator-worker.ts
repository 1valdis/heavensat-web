import * as satellite from '../../satellite.js'
import { WorkerAnswer, WorkerQuery } from './message-types'
import { MsdfGeometry, MsdfGeometryBuilder } from './msdf'
import { TEXT_FLOATS_PER_ORIGIN, TEXT_FLOATS_PER_POSITION, TEXT_FLOATS_PER_UV, TEXT_FLOATS_PER_VERTEX, TEXT_VERTICES_PER_QUAD } from './scene-constants.js'
import { SatelliteFilter } from '../SatelliteFilter/SatellitesFilter.js'

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

const kmToEarthRadii = (km: number) => km / 6371

// eslint-disable-next-line sonarjs/cognitive-complexity
const isSatellitePassingTheFilters = (filter: SatelliteFilter, elements: satellite.PositionAndVelocity) => {
  const { meanElements } = elements
  for (const [key, { min, max, enabled }] of Object.entries(filter)) {
    if (!enabled) continue

    const apogeeInEartRadii = meanElements.am * (1 + meanElements.em) - 1
    const perigeeInEarthRadii = meanElements.am * (1 - meanElements.em) - 1

    switch (key) {
      case 'inclination_deg':
        if (meanElements.im < min * (Math.PI / 180) || meanElements.im > max * (Math.PI / 180)) {
          return false
        }
        break
      case 'eccentricity':
        if (meanElements.em < min || meanElements.em > max) {
          return false
        }
        break
      case 'period_minutes':
      {
        const periodMinutes = 2 * Math.PI / meanElements.nm
        if (periodMinutes < min || periodMinutes > max) {
          return false
        }
        break
      }
      case 'apogee_km':
        if (apogeeInEartRadii < kmToEarthRadii(min) || apogeeInEartRadii > kmToEarthRadii(max)) {
          return false
        }

        break
      case 'perigee_km':
        if (perigeeInEarthRadii < kmToEarthRadii(min) || perigeeInEarthRadii > kmToEarthRadii(max)) {
          return false
        }
    }
  }
  return true
}

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
    const { date, location, queryId, filter } = e.data
    const gmst = satellite.gstime(date)
    const locationForLib = {
      longitude: satellite.degreesToRadians(location.longitude),
      latitude: satellite.degreesToRadians(location.latitude),
      height: location.altitude / 1000
    }

    const positions = satRecs
      .map((satRec) => {
        const positionEci = satellite.propagate(satRec, date)
        if (typeof positionEci.position !== 'object') {
          return null
        }
        return {
          positionEci: {
            position: positionEci.position,
            velocity: positionEci.velocity,
            meanElements: positionEci.meanElements,
          },
          norad: satRec.satnum,
        }
      })
      .filter((position) => !!position)
      .filter(({ positionEci }) => isSatellitePassingTheFilters(filter, positionEci))
      .map(({ positionEci, norad }) => {
        const positionEcf = satellite.eciToEcf(positionEci.position as satellite.EciVec3<number>, gmst)
        const lookAngles = satellite.ecfToLookAngles(locationForLib, positionEcf)
        return {
          norad,
          cartesian: lookAnglesToCartesian(lookAngles.elevation, lookAngles.azimuth)
        }
      })

    const successful = (positions.filter((position) => position.cartesian) as { norad: string, cartesian: [number, number, number] }[])
      .filter(position => position.cartesian[1] > 0)
    const positionsArray = concat(successful.map(position => new Float32Array(position.cartesian!)))
    const idsArray = concat(successful.map(position => new Int32Array([noradToIdMap.get(position.norad)!])))

    const totalSymbols = successful.reduce((acc, sat) => acc + geometriesMap.get(sat.norad)!.chars.length, 0)
    const length = TEXT_FLOATS_PER_VERTEX * TEXT_VERTICES_PER_QUAD * totalSymbols
    const interleavedTexts = new Float32Array(length)

    const originOffset = TEXT_FLOATS_PER_POSITION
    const uvOffset = originOffset + TEXT_FLOATS_PER_ORIGIN
    for (let satI = 0, totalSymbolI = 0; satI < successful.length; satI++) {
      const sat = successful[satI]!
      const geometry = geometriesMap.get(sat.norad)
      const geometryPositionMap = geometriesPositionsMap.get(sat.norad)!
      const geometryUVCoords = geometriesUVCoordsMap.get(sat.norad)!
      for (let symbolWithinNameI = 0; symbolWithinNameI < geometry!.chars.length; symbolWithinNameI++) {
        const startingOffsetOfSymbol = (totalSymbolI + symbolWithinNameI) * TEXT_FLOATS_PER_VERTEX * TEXT_VERTICES_PER_QUAD
        for (let vertexOfQuad = 0; vertexOfQuad < TEXT_VERTICES_PER_QUAD; vertexOfQuad++) {
          const vertexWithOffsets = startingOffsetOfSymbol + vertexOfQuad * TEXT_FLOATS_PER_VERTEX
          // 7 numbers per vertex: 2 for position, 3 for origin, 2 for uv
          interleavedTexts[vertexWithOffsets] = geometryPositionMap[symbolWithinNameI * TEXT_VERTICES_PER_QUAD * TEXT_FLOATS_PER_POSITION + vertexOfQuad * TEXT_FLOATS_PER_POSITION]!
          interleavedTexts[vertexWithOffsets + 1] = geometryPositionMap[symbolWithinNameI * TEXT_VERTICES_PER_QUAD * TEXT_FLOATS_PER_POSITION + vertexOfQuad * TEXT_FLOATS_PER_POSITION + 1]!
          interleavedTexts[vertexWithOffsets + originOffset] = sat.cartesian[0]!
          interleavedTexts[vertexWithOffsets + originOffset + 1] = sat.cartesian[1]!
          interleavedTexts[vertexWithOffsets + originOffset + 2] = sat.cartesian[2]!
          interleavedTexts[vertexWithOffsets + uvOffset] = geometryUVCoords[symbolWithinNameI * TEXT_VERTICES_PER_QUAD * TEXT_FLOATS_PER_UV + vertexOfQuad * TEXT_FLOATS_PER_UV]!
          interleavedTexts[vertexWithOffsets + uvOffset + 1] = geometryUVCoords[symbolWithinNameI * TEXT_VERTICES_PER_QUAD * TEXT_FLOATS_PER_UV + vertexOfQuad * TEXT_FLOATS_PER_UV + 1]!
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
