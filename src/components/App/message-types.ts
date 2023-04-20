import { Location } from './common-types'

export type BasicEvent = {
  queryId: string
}

export type InitQuery = BasicEvent & {
  type: 'init',
  tles: Array<[string, string]>
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
    positionsOfTheRest: Float32Array
  }
}

export type WorkerAnswer = InitAnswer | PropagateAnswer
