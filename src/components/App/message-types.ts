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
  result: Array<{
    norad: string,
    cartesian: [number, number, number] | null,
  }>
}

export type WorkerAnswer = InitAnswer | PropagateAnswer
