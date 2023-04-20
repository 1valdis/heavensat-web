import { InitQuery, PropagateQuery, WorkerAnswer } from './message-types.js'
import { Location, PropagatedSatellite, Satellite } from './common-types'

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

export class Propagator extends typedEventTarget {
  private readonly worker = new Worker(new URL('./propagator-worker.ts', import.meta.url))
  private latestPropagateQuery: PropagateQuery | null = null
  private latestInitializeQuery: InitQuery | null = null
  private busy = false

  #_propagated: PropagatedSatellite[] = []

  public get propagated (): readonly PropagatedSatellite[] {
    return this.#_propagated
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
        this.#_propagated = event.data.result
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
