import { Location, Satellite } from '../common-types'
import { MsdfDefinition } from '../msdf'

export type BasicEvent = {
  queryId: string
}

export type Buffers = {
  control: Int32Array
  positions: Float32Array
  ids: Int32Array
  textsOrigins: Float32Array
  textsPositions: Float32Array
  textsUVCoords: Float32Array
}

export type InitQuery = BasicEvent & {
  type: 'init',
  '3LEs': Array<[string, string, string]>,
  ids: Array<number>,
  msdfDefinition: MsdfDefinition,
  doubleBuffer: [Buffers, Buffers],
  satellites: Satellite[]
}

export type PropagateQuery = BasicEvent & {
  type: 'process',
  date: Date,
  location: Location
}

export type WorkerQuery = InitQuery | PropagateQuery

export type InitAnswer = BasicEvent & {
  type: 'init'
}

export type PropagateAnswer = BasicEvent & {
  type: 'process'
}

export type WorkerAnswer = InitAnswer | PropagateAnswer
