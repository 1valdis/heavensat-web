import { InitQuery, PropagateQuery, WorkerAnswer } from './message-types'
import { Location, Satellite } from './common-types'
import { chunkify } from './chunkify'
import type { MsdfDefinition } from './msdf'

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

class Propagator extends typedEventTarget {
  private readonly worker = new Worker(
    new URL('./propagator-worker.ts', import.meta.url), { type: 'module' }
  )

  private latestPropagateQuery: PropagateQuery | null = null
  private latestInitializeQuery: InitQuery | null = null
  private busy = false

  #propagated: PropagationResults = {
    propagatedPositions: new Float32Array(0),
    propagatedIds: new Int32Array(0),
    texts: new Float32Array(0)
  }

  #failedNorads: string[] = []

  public get propagated (): PropagationResults {
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
  }

  init (offset: number, satellites: Satellite[], msdfDefinition: MsdfDefinition) {
    this.latestInitializeQuery = {
      type: 'init',
      queryId: crypto.randomUUID(),
      '3LEs': satellites.map(sat => sat['3leLines']),
      ids: satellites.map((sat, index) => index + offset),
      msdfDefinition
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

export type PropagationResults = {
  propagatedPositions: Float32Array,
  propagatedIds: Int32Array,
  texts: Float32Array
}

export class ConcurrentPropagator extends typedEventTarget {
  private workers: Array<{
    propagator: Propagator,
    assignedSatellites: Satellite[]
  }> = Array.from({ length: 2 }, () => {
      const propagator = new Propagator()
      propagator.addEventListener('propagate-result', () => {
        this.dispatchEvent(new CustomEvent('propagate-result'))
        const keysToConcatenate: (keyof PropagationResults)[] = ['propagatedPositions', 'propagatedIds', 'texts']
        const resultArrays = keysToConcatenate.map(key => {
          const resultArray = new (key === 'propagatedIds' ? Int32Array : Float32Array)(this.workers.reduce((acc, current) => acc + current.propagator.propagated[key].length, 0))
          let currentOffset = 0
          this.workers.forEach(worker => {
            resultArray.set(worker.propagator.propagated[key], currentOffset)
            currentOffset += worker.propagator.propagated[key].length
          })
          return resultArray
        })
        this.#propagated = {
          propagatedPositions: resultArrays[0]! as Float32Array,
          propagatedIds: resultArrays[1]! as Int32Array,
          texts: resultArrays[2]! as Float32Array
        }
      })
      return {
        propagator,
        assignedSatellites: []
      }
    })

  #propagated: PropagationResults = {
    propagatedPositions: new Float32Array(0),
    propagatedIds: new Int32Array(0),
    texts: new Float32Array(0)
  }

  public get propagated (): PropagationResults {
    return this.#propagated
  }

  public get failedNorads (): readonly string[] {
    return this.workers.flatMap(worker => worker.propagator.failedNorads)
  }

  init (satellites: Satellite[], msdfDefinition: MsdfDefinition) {
    const chunks = chunkify(satellites, this.workers.length)

    this.workers.forEach((worker, index) => {
      const offset = chunks.reduce((acc, current, currentIndex) => {
        if (currentIndex >= index) {
          return acc
        }
        return acc + current.length
      }, 0)
      worker.propagator.init(offset, chunks[index]!, msdfDefinition)
      worker.assignedSatellites = chunks[index]!
    })
  }

  process (date: Date, location: Location) {
    this.workers.forEach((worker) => {
      worker.propagator.process(date, location)
    })
  }
}
