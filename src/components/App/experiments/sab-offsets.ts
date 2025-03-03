// SharedArrayBuffer structure, n is the number of satellites, m is the number of characters for all satellites of this worker:
  // for each worker:
    // [0] - control flag for this part of double buffer being used by one of the threads
    // [n*3] - cartesian coordinates of satellites asssigned to this worker
    // [n] - ids of satellites asssigned to this worker
    // [m * 3 * 6] - origins of texts of all characters for all satellites of this worker
    // [m * 12] - positions of texts for all characters in satellite names of this worker
    // [m * 12] - uvs of texts for all characters in satellite names of this worker
  // multiply by 2 for double buffer

export const ELEMENTS_PER_POSITION = 3
export const ELEMENTS_PER_ID = 1
export const ELEMENTS_PER_TEXT_ORIGIN = 18
export const ELEMENTS_PER_TEXT_POSITION = 12
export const ELEMENTS_PER_TEXT_UV = 12

export const BYTES_PER_FLOAT = 4

export const getControlBytesSize = () => {
  return 1 * BYTES_PER_FLOAT
}

export const getPositionsBytesSize = (numberOfSatellites: number) => {
  return numberOfSatellites * ELEMENTS_PER_POSITION * BYTES_PER_FLOAT
}

export const getIdsBytesSize = (numberOfSatellites: number) => {
  return numberOfSatellites * ELEMENTS_PER_ID * BYTES_PER_FLOAT
}

export const getTextsOriginsBytesSize = (numberOfCharacters: number) => {
  return numberOfCharacters * ELEMENTS_PER_TEXT_ORIGIN * BYTES_PER_FLOAT
}

export const getTextsPositionsBytesSize = (numberOfCharacters: number) => {
  return numberOfCharacters * ELEMENTS_PER_TEXT_POSITION * BYTES_PER_FLOAT
}

export const getTextsUVsBytesSize = (numberOfCharacters: number) => {
  return numberOfCharacters * ELEMENTS_PER_TEXT_UV * BYTES_PER_FLOAT
}

export const getHalfDoubleBufferBytesSize = (numberOfSatellites: number, numberOfCharacters: number) => {
  return getControlBytesSize() + getPositionsBytesSize(numberOfSatellites) + getIdsBytesSize(numberOfSatellites) + getTextsOriginsBytesSize(numberOfCharacters) + getTextsPositionsBytesSize(numberOfCharacters) + getTextsUVsBytesSize(numberOfCharacters)
}

export const getTotalBytesSize = (numberOfSatellites: number, numberOfCharacters: number) => {
  return getHalfDoubleBufferBytesSize(numberOfSatellites, numberOfCharacters) * 2
}
