import { MsdfDefinition } from '../../Scene/msdf.js'
import { Location, Satellite } from '../../common-types.js'
import { chunkify } from '../../Scene/chunkify.js'
import { PropagateQuery, InitQuery, WorkerAnswer, Buffers } from './message-types-sab.js'
import { BYTES_PER_FLOAT, getControlBytesSize, getHalfDoubleBufferBytesSize, getIdsBytesSize, getPositionsBytesSize, getTextsOriginsBytesSize, getTextsPositionsBytesSize, getTextsUVsBytesSize, getTotalBytesSize } from './sab-offsets.js'
import { ShaderProgramsMap } from '../../Scene/scene-drawing.js'
import { lockSomeSide, unlock } from './lock.js'

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

const createBufferSet = (sab: SharedArrayBuffer, baseOffset: number, counts: {
  satellitesCount: number,
  charactersCount: number,
  size: number
}): Buffers => {
  const sizes = {
    control: getControlBytesSize(),
    positions: getPositionsBytesSize(counts.satellitesCount),
    ids: getIdsBytesSize(counts.satellitesCount),
    textsOrigins: getTextsOriginsBytesSize(counts.charactersCount),
    textsPositions: getTextsPositionsBytesSize(counts.charactersCount),
    textsUVs: getTextsUVsBytesSize(counts.charactersCount)
  }

  let currentOffset = baseOffset
  return {
    control: new Int32Array(sab, currentOffset, sizes.control / BYTES_PER_FLOAT),
    positions: new Float32Array(sab, (currentOffset += sizes.control), sizes.positions / BYTES_PER_FLOAT),
    ids: new Int32Array(sab, (currentOffset += sizes.positions), sizes.ids / BYTES_PER_FLOAT),
    textsOrigins: new Float32Array(sab, (currentOffset += sizes.ids), sizes.textsOrigins / BYTES_PER_FLOAT),
    textsPositions: new Float32Array(sab, (currentOffset += sizes.textsOrigins), sizes.textsPositions / BYTES_PER_FLOAT),
    textsUVCoords: new Float32Array(sab, (currentOffset + sizes.textsPositions), sizes.textsUVs / BYTES_PER_FLOAT)
  }
}

class Propagator extends typedEventTarget {
  private readonly worker = new Worker(
    new URL('./propagator-worker-sab.ts', import.meta.url), { type: 'module' }
  )

  private latestPropagateQuery: PropagateQuery | null = null
  private latestInitializeQuery: InitQuery | null = null
  private busy = false
  #initialized = false
  #offsetBytes = 0

  public get initialized (): boolean {
    return this.#initialized
  }

  constructor () {
    super()
    this.worker.onmessage = (event: MessageEvent<WorkerAnswer>) => {
      if (event.data.type === 'init' && event.data.queryId !== this.latestInitializeQuery?.queryId) {
        this.worker.postMessage(this.latestInitializeQuery)
        return
      }
      if (event.data.type === 'process') {
        if (!this.#initialized) { this.#initialized = true }
        this.busy = false
        if (event.data.queryId !== this.latestPropagateQuery?.queryId) {
          this.worker.postMessage(this.latestPropagateQuery)
          this.busy = true
        }
        this.dispatchEvent(new CustomEvent('propagate-result'))
      }
    }
    this.worker.onerror = console.log
  }

  init (offsetSatellites: number, satellites: Satellite[], msdfDefinition: MsdfDefinition, sab: SharedArrayBuffer, doubleBuffer: [Buffers, Buffers]) {
    this.latestInitializeQuery = {
      type: 'init',
      queryId: crypto.randomUUID(),
      '3LEs': satellites.map(sat => sat['3leLines']),
      ids: satellites.map((sat, index) => index + offsetSatellites),
      msdfDefinition,
      doubleBuffer,
      satellites
    }
    this.#initialized = false
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

  get offsetBytes (): number {
    return this.#offsetBytes
  }
}

export class ConcurrentPropagatorSAB extends typedEventTarget {
  #initialized = false
  #latestInitData: { buffers: [Buffers, Buffers], satellitesOffset: number, satellites: Satellite[], charactersCount: number }[] | null = null
  #mustRecreateWebGLBuffers = false

  private workers: Array<{
    propagator: Propagator,
    assignedSatellites: Satellite[]
  }> = Array.from({ length: 2 }, () => {
      const propagator = new Propagator()
      propagator.addEventListener('propagate-result', () => {
        if (!this.#initialized && this.workers.every(worker => worker.propagator.initialized)) {
          this.#initialized = true
          this.#mustRecreateWebGLBuffers = true
        }
        if (this.#initialized) { this.dispatchEvent(new CustomEvent('propagate-result')) }
      })
      return {
        propagator,
        assignedSatellites: []
      }
    })

  init (satellites: Satellite[], msdfDefinition: MsdfDefinition) {
    this.#initialized = false

    const { sab, initData } = this.getInitData(this.workers.length, satellites)
    this.#latestInitData = initData

    this.workers.forEach((worker, index) => {
      worker.propagator.init(initData[index]!.satellitesOffset, initData[index]!.satellites, msdfDefinition, sab, initData[index]!.buffers)
    })
  }

  process (date: Date, location: Location) {
    this.workers.forEach((worker) => {
      worker.propagator.process(date, location)
    })
  }

  get initialized (): boolean {
    return this.#initialized
  }

  private getInitData (partsCount: number, satellites: Satellite[]): { sab: SharedArrayBuffer, initData: { buffers: [Buffers, Buffers], satellitesOffset: number, satellites: Satellite[], charactersCount: number }[] } {
    const chunks = chunkify(satellites, partsCount)

    const offsets = chunks.map(chunk => {
      const charactersCount = chunk.reduce((acc, sat) => acc + sat['3leLines'][0].slice(2).length, 0)

      return {
        satellitesCount: chunk.length,
        charactersCount,
        size: getTotalBytesSize(chunk.length, charactersCount),
        satellites: chunk,
      }
    })

    const sab = new SharedArrayBuffer(offsets.reduce((acc, offset) => acc + offset.size, 0))

    return {
      sab,
      initData: offsets.map((offset, index) => {
        const offsetForCurrentPart = offsets.slice(0, index).reduce((acc, offset) => acc + offset.size, 0)
        const halfBufferSize = getHalfDoubleBufferBytesSize(offset.satellitesCount, offset.charactersCount)

        return {
          buffers: [
            createBufferSet(sab, offsetForCurrentPart, offset),
            createBufferSet(sab, offsetForCurrentPart + halfBufferSize, offset)
          ],
          satellitesOffset: offsets.slice(0, index).reduce((acc, offset) => acc + offset.satellitesCount, 0),
          satellites: offset.satellites,
          charactersCount: offset.charactersCount
        }
      })
    }
  }

  updateWebGLBuffers (gl: WebGL2RenderingContext, shaderPrograms: ShaderProgramsMap) {
    if (!this.#initialized || !this.#latestInitData) { return }

    if (this.#mustRecreateWebGLBuffers && this.#latestInitData) {
      gl.bindBuffer(gl.ARRAY_BUFFER, shaderPrograms.satellites.buffers.positions)
      gl.bufferData(gl.ARRAY_BUFFER, this.#latestInitData.reduce((acc, initData) => acc + initData.buffers[0].positions.byteLength, 0), gl.STREAM_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, shaderPrograms.satellites.buffers.ids)
      gl.bufferData(gl.ARRAY_BUFFER, this.#latestInitData.reduce((acc, initData) => acc + initData.buffers[0].ids.byteLength, 0), gl.STREAM_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, shaderPrograms.satelliteNames.buffers.texts)
      gl.bufferData(gl.ARRAY_BUFFER, this.#latestInitData.reduce((acc, initData) => acc + initData.buffers[0].textsPositions.byteLength, 0), gl.STREAM_DRAW)
      this.#mustRecreateWebGLBuffers = false
    }
    this.#latestInitData!.forEach((initData, index) => {
      const positionsOffset = this.#latestInitData!.slice(0, index).reduce((acc, initData) => acc + initData.buffers[0].positions.byteLength, 0)
      const idsOffset = this.#latestInitData!.slice(0, index).reduce((acc, initData) => acc + initData.buffers[0].ids.byteLength, 0)
      const textsPositionsOffset = this.#latestInitData!.slice(0, index).reduce((acc, initData) => acc + initData.buffers[0].textsPositions.byteLength, 0)
      const side = lockSomeSide(initData.buffers[0].control, initData.buffers[1].control)
      gl.bindBuffer(gl.ARRAY_BUFFER, shaderPrograms.satellites.buffers.positions)
      gl.bufferSubData(gl.ARRAY_BUFFER, positionsOffset, initData.buffers[side].positions)
      gl.bindBuffer(gl.ARRAY_BUFFER, shaderPrograms.satellites.buffers.ids)
      gl.bufferSubData(gl.ARRAY_BUFFER, idsOffset, initData.buffers[side].ids)
      gl.bindBuffer(gl.ARRAY_BUFFER, shaderPrograms.satelliteNames.buffers.texts)
      gl.bufferSubData(gl.ARRAY_BUFFER, textsPositionsOffset, initData.buffers[side].textsPositions)
      unlock(initData.buffers[side].control)
    })
  }

  get satellitesCount (): number {
    return this.#latestInitData!.reduce((acc, initData) => acc + initData.satellites.length, 0)
  }

  get charactersCount (): number {
    return this.#latestInitData!.reduce((acc, initData) => acc + initData.charactersCount, 0)
  }
}
