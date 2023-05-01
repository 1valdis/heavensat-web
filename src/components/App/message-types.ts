import { Location } from './common-types'
import type MsdfDefinition from './msdf-definition.json'

export type BasicEvent = {
  queryId: string
}

export type InitQuery = BasicEvent & {
  type: 'init',
  '3LEs': Array<[string, string, string]>,
  msdfDefinition: typeof MsdfDefinition
}

export type PropagateQuery = BasicEvent & {
  type: 'process',
  date: Date,
  location: Location
}

export type WorkerQuery = InitQuery | PropagateQuery

export type InitAnswer = BasicEvent & {
  type: 'init',
  message: 'ok',
}

export type PropagateAnswer = BasicEvent & {
  type: 'process',
  result: {
    failedNorads: string[],
    propagatedPositions: Float32Array
    textsOrigins: Float32Array
    textsPositions: Float32Array,
    textsUVCoords: Float32Array
  }
}

export type WorkerAnswer = InitAnswer | PropagateAnswer
