import { Location } from '../common-types'
import { MsdfDefinition } from './msdf'

export type BasicEvent = {
  queryId: string
}

export type InitQuery = BasicEvent & {
  type: 'init',
  '3LEs': Array<[string, string, string]>,
  ids: Array<number>,
  msdfDefinition: MsdfDefinition
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
    propagatedIds: Int32Array
    texts: Float32Array
  }
}

export type WorkerAnswer = InitAnswer | PropagateAnswer
