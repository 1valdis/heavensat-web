/* eslint-disable sonarjs/no-duplicate-string */
import { InitQuery, PropagateQuery, WorkerAnswer } from './message-types.js'
import { Location, Satellite } from './common-types'
import { chunkify } from './chunkify'

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

const typedEventTarget = EventTarget as {new(): StateEventTarget; prototype: StateEventTarget}

class Propagator extends typedEventTarget {
  private readonly worker = new Worker(new URL('./propagator-worker.ts', import.meta.url))
  private latestPropagateQuery: PropagateQuery | null = null
  private latestInitializeQuery: InitQuery | null = null
  private busy = false

  #propagated: Float32Array = new Float32Array(0)
  #failedNorads: string[] = []

  public get propagated (): Float32Array {
    return this.#propagated
  }

  public get failedNorads (): readonly string[] {
    return this.#failedNorads
  }

  constructor () {
    super()
    this.worker.onmessage = (event: MessageEvent<WorkerAnswer>) => {
      if (event.data.type === 'init' && event.data.queryId !== this.latestInitializeQuery?.queryId) {
        this.worker.postMessage(this.latestInitializeQuery)
        return
      }
      if (event.data.type === 'process') {
        this.busy = false
        this.#failedNorads = event.data.result.failedNorads
        this.#propagated = event.data.result.positionsOfTheRest
        this.dispatchEvent(new CustomEvent('propagate-result'))
        if (event.data.queryId !== this.latestPropagateQuery?.queryId) {
          this.worker.postMessage(this.latestPropagateQuery)
          this.busy = true
        }
      }
    }
    this.worker.onerror = console.log
  }

  init (satellites: Satellite[]) {
    this.latestInitializeQuery = {
      type: 'init',
      queryId: crypto.randomUUID(),
      tles: satellites.map(sat => sat.tleLines)
    }
    this.worker.postMessage(this.latestInitializeQuery)
  }

  process (date: Date, location: Location) {
    this.latestPropagateQuery = {
      type: 'process',
      queryId: crypto.randomUUID(),
      date,
      location
    }
    if (!this.busy) {
      this.worker.postMessage(this.latestPropagateQuery)
      this.busy = true
    }
  }
}

export class ConcurrentPropagator extends typedEventTarget {
  private workers: Array<{
    propagator: Propagator,
    assignedSatellites: Satellite[]
  }> = Array.from({ length: 2 }, () => {
      const propagator = new Propagator()
      propagator.addEventListener('propagate-result', () => {
        this.dispatchEvent(new CustomEvent('propagate-result'))
        const resultArray = new Float32Array(this.workers.reduce((acc, current) => acc + current.propagator.propagated.length, 0))
        let currentOffset = 0
        this.workers.forEach(worker => {
          resultArray.set(worker.propagator.propagated, currentOffset)
          currentOffset += worker.propagator.propagated.length
        })
        this.#propagated = resultArray
      })
      return {
        propagator,
        assignedSatellites: []
      }
    })

  #propagated: Float32Array = new Float32Array(0)

  public get propagated (): Float32Array {
    return this.#propagated
  }

  public get failedNorads (): readonly string[] {
    return this.workers.flatMap(worker => worker.propagator.failedNorads)
  }

  init (satellites: Satellite[]) {
    const chunks = chunkify(satellites, this.workers.length)

    this.workers.forEach((worker, index) => {
      worker.propagator.init(chunks[index]!)
      worker.assignedSatellites = chunks[index]!
    })
  }

  process (date: Date, location: Location) {
    this.workers.forEach((worker) => {
      worker.propagator.process(date, location)
    })
  }
}
