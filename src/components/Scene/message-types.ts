import { OMMJsonObject } from 'satellite.js'
import { Location } from '../../common/types'
import { SatelliteFilter } from '../SatelliteFilter/SatellitesFilter.js'
import { MsdfDefinition } from './msdf'
import { PropagationResults } from './propagator.js'

export type BasicEvent = {
  queryId: string
}

export type InitQuery = BasicEvent & {
  type: 'init',
  // '3LEs': Array<[string, string, string]>,
  omm: OMMJsonObject[]
  ids: Array<number>,
  msdfDefinition: MsdfDefinition
}

export type PropagateQuery = BasicEvent & {
  type: 'process',
  date: Date,
  location: Location,
  filter: SatelliteFilter
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
  } & PropagationResults
}

export type WorkerAnswer = InitAnswer | PropagateAnswer
