/* eslint-disable no-redeclare */
import * as satellite from 'satellite.js'
import { WorkerQuery, WorkerAnswer, Buffers } from './message-types-sab.js'
import { MsdfGeometry, MsdfGeometryBuilder } from '../../Scene/msdf.js'
import { lock, unlock } from './lock.js'

const INVISIBLE_POSITION = new Float32Array([10, 0, 0])

type ParametersExceptFirst<F> =
   F extends (arg0: any, ...rest: infer R) => any ? R : never;

function typedPostMessage (message: WorkerAnswer, ...rest: ParametersExceptFirst<typeof postMessage>) {
  postMessage(message, ...rest)
}

// todo do that in the shader
function lookAnglesToCartesian (elevation: number, azimuth: number): [number, number, number] {
  const x = Math.cos(elevation) * Math.cos(azimuth)
  const y = -Math.cos(elevation) * Math.sin(azimuth)
  const z = Math.sin(elevation)

  return [y, z, x]
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

let satRecs: satellite.SatRec[] = []
let currentSideOfDoubleBuffer: 0 | 1 = 0
let firstPass = true

let buffers: [Buffers, Buffers] | null = null

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

    buffers = e.data.doubleBuffer
    buffers[0].ids.set(e.data.ids)
    buffers[1].ids.set(e.data.ids)

  } else if (e.data.type === 'process') {
    if (!buffers) {
      throw new Error('Shared array buffer not initialized')
    }

    const { date, location, queryId } = e.data
    const gmst = satellite.gstime(date)
    const locationForLib = {
      longitude: satellite.degreesToRadians(location.longitude),
      latitude: satellite.degreesToRadians(location.latitude),
      height: location.altitude / 1000
    }

    const currentBuffer = buffers[currentSideOfDoubleBuffer]

    lock(currentBuffer.control)

    for (let i = 0, textIndex = 0; i < satRecs.length; i++) {
      const satRec = satRecs[i]!
      const positionEci = satellite.propagate(satRec!, date)
      const textGeometry = geometriesMap.get(satRec.satnum)!.chars
      if (typeof positionEci.position !== 'object') {
        currentBuffer.positions.set(INVISIBLE_POSITION, i * 3)
        currentBuffer.textsOrigins.set(duplicate(INVISIBLE_POSITION, 6 * textGeometry.length), textIndex * 3)
      } else {
        const positionEcf = satellite.eciToEcf(positionEci.position, gmst)
        const lookAngles = satellite.ecfToLookAngles(locationForLib, positionEcf)
        const cartesian = new Float32Array(lookAnglesToCartesian(lookAngles.elevation, lookAngles.azimuth))
        if (cartesian[1]! < 0) {
          currentBuffer.positions.set(INVISIBLE_POSITION, i * 3)
          currentBuffer.textsOrigins.set(duplicate(INVISIBLE_POSITION, 6 * textGeometry.length), textIndex * 3)
        } else {
          currentBuffer.positions.set(cartesian, i * 3)
          currentBuffer.textsOrigins.set(duplicate(cartesian, 6 * textGeometry.length), textIndex * 3)
        }
      }
      currentBuffer.textsPositions.set(geometriesPositionsMap.get(satRec.satnum)!, textIndex * 2)
      currentBuffer.textsUVCoords.set(geometriesUVCoordsMap.get(satRec.satnum)!, textIndex * 2)
      textIndex += textGeometry.length * 6
    }

    if (firstPass) {
      firstPass = false
      const otherBuffer = buffers[currentSideOfDoubleBuffer === 0 ? 1 : 0]!
      otherBuffer.positions.set(currentBuffer.positions)
      otherBuffer.ids.set(currentBuffer.ids)
      otherBuffer.textsOrigins.set(currentBuffer.textsOrigins)
      otherBuffer.textsPositions.set(currentBuffer.textsPositions)
      otherBuffer.textsUVCoords.set(currentBuffer.textsUVCoords)
    }

    unlock(currentBuffer.control)
    currentSideOfDoubleBuffer = currentSideOfDoubleBuffer === 0 ? 1 : 0;

    typedPostMessage({
      type: 'process',
      queryId
    })
  }
}
