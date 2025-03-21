import * as satellite from '../satellite.js'

const EARTH_RADIUS = 6371.135

export const getPerigee = (meanElements: satellite.MeanElements) => {
  const perigeeInEarthRadii = meanElements.am * (1 - meanElements.em) - 1
  return perigeeInEarthRadii * EARTH_RADIUS
}

export const getApogee = (meanElements: satellite.MeanElements) => {
  const apogeeInEartRadii = meanElements.am * (1 + meanElements.em) - 1
  return apogeeInEartRadii * EARTH_RADIUS
}

export const getPeriodMinutes = (meanElements: satellite.MeanElements) => {
  return 2 * Math.PI / meanElements.nm
}
