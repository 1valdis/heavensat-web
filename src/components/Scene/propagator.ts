import { InitQuery, PropagateQuery, WorkerAnswer } from './message-types'
import { Location, Satellite } from '../common-types'
import { chunkify } from './chunkify'
import type { MsdfDefinition } from './msdf'
import { SatelliteFilter } from '../SatelliteFilter/SatellitesFilter.js'

const WORKERS_COUNT = 3

interface StateEventMap {
  'propagate-result': CustomEvent;
}

interface StateEventTarget extends EventTarget {
  addEventListener<K extends keyof StateEventMap>(
    type: K,
    listener: (ev: StateEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void;
}

const typedEventTarget = EventTarget as { new(): StateEventTarget; prototype: StateEventTarget }

export type PropagationResults = {
  propagatedPositions: Float32Array,
  propagatedIdsAndShadow: Int32Array,
  texts: Float32Array
}
export type PropagationResultsWithChangedFlag = PropagationResults & { changedSinceLastRequest: boolean }

class Propagator extends typedEventTarget {
  private readonly worker = new Worker(
    new URL('./propagator-worker.ts', import.meta.url), { type: 'module' }
  )

  #assignedSatellites: Satellite[] = []
  private latestPropagateQuery: PropagateQuery | null = null
  private latestInitializeQuery: InitQuery | null = null
  private busy = false

  #propagated: PropagationResults = {
    propagatedPositions: new Float32Array(0),
    propagatedIdsAndShadow: new Int32Array(0),
    texts: new Float32Array(0)
  }

  #failedNorads: string[] = []

  public get assignedSatellites (): Satellite[] {
    return this.#assignedSatellites
  }

  public get propagated (): PropagationResults {
    return this.#propagated
  }

  public get failedNorads (): readonly string[] {
    return this.#failedNorads
  }

  constructor (offset: number, satellites: Satellite[], msdfDefinition: MsdfDefinition) {
    super()
    this.latestInitializeQuery = {
      type: 'init',
      queryId: crypto.randomUUID(),
      '3LEs': satellites.map(sat => sat['3leLines']),
      ids: satellites.map((sat, index) => index + offset),
      msdfDefinition
    }
    this.#assignedSatellites = satellites
    this.worker.onmessage = (event: MessageEvent<WorkerAnswer>) => {
      if (event.data.type === 'init' && event.data.queryId !== this.latestInitializeQuery?.queryId) {
        this.worker.postMessage(this.latestInitializeQuery)
        return
      }
      if (event.data.type === 'process') {
        this.busy = false
        const { failedNorads, ...rest } = event.data.result
        this.#failedNorads = failedNorads
        this.#propagated = rest
        this.dispatchEvent(new CustomEvent('propagate-result'))
        if (event.data.queryId !== this.latestPropagateQuery?.queryId) {
          this.worker.postMessage(this.latestPropagateQuery)
          this.busy = true
        }
      }
    }
    this.worker.onerror = console.log
    this.worker.postMessage(this.latestInitializeQuery)
  }

  process (date: Date, location: Location, filter: SatelliteFilter) {
    this.latestPropagateQuery = {
      type: 'process',
      queryId: crypto.randomUUID(),
      date,
      location,
      filter
    }
    if (!this.busy) {
      this.worker.postMessage(this.latestPropagateQuery)
      this.busy = true
    }
  }
}

export class ConcurrentPropagator extends typedEventTarget {
  private workers: Array<{
    propagator: Propagator
  }>

  constructor (satellites: Satellite[], msdfDefinition: MsdfDefinition) {
    super()
    const chunks = chunkify(satellites, WORKERS_COUNT)

    this.workers = Array.from({ length: WORKERS_COUNT }, (item, index) => {
      const offset = chunks.reduce((acc, current, currentIndex) => {
        if (currentIndex >= index) {
          return acc
        }
        return acc + current.length
      }, 0)
      const propagator = new Propagator(offset, chunks[index]!, msdfDefinition)
      propagator.addEventListener('propagate-result', () => {
        this.#requestedSinceRefresh = false
        this.#propagatedResultId++
        this.dispatchEvent(new CustomEvent('propagate-result'))
      })
      return {
        propagator,
      }
    })
  }

  #propagated: PropagationResults = {
    propagatedPositions: new Float32Array(0),
    propagatedIdsAndShadow: new Int32Array(0),
    texts: new Float32Array(0)
  }

  #propagatedResultId = 0
  #requestedSinceRefresh = false
  public get propagatedResultId (): number {
    return this.#propagatedResultId
  }

  public get propagated (): PropagationResultsWithChangedFlag {
    if (this.#requestedSinceRefresh) { return { ...this.#propagated, changedSinceLastRequest: false } }
    const keysToConcatenate: (keyof PropagationResults)[] = ['propagatedPositions', 'propagatedIdsAndShadow', 'texts']
    const resultArrays = keysToConcatenate.map(key => {
      const resultArray = new (key === 'propagatedIdsAndShadow' ? Int32Array : Float32Array)(this.workers.reduce((acc, current) => acc + current.propagator.propagated[key].length, 0))
      let currentOffset = 0
      this.workers.forEach(worker => {
        resultArray.set(worker.propagator.propagated[key], currentOffset)
        currentOffset += worker.propagator.propagated[key].length
      })
      return resultArray
    })
    this.#propagated = {
      propagatedPositions: resultArrays[0]! as Float32Array,
      propagatedIdsAndShadow: resultArrays[1]! as Int32Array,
      texts: resultArrays[2]! as Float32Array
    }
    this.#requestedSinceRefresh = true
    return { ...this.#propagated, changedSinceLastRequest: true }
  }

  public get failedNorads (): readonly string[] {
    return this.workers.flatMap(worker => worker.propagator.failedNorads)
  }

  process (date: Date, location: Location, filter: SatelliteFilter) {
    this.workers.forEach((worker) => {
      worker.propagator.process(date, location, filter)
    })
  }
}
