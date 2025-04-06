import { useMemo } from 'react'
import { Assets } from '../App/assets-loader'
import { Satellite } from '../../common/types.js'
import { OMMJsonObject } from 'satellite.js'

const catalogToSatellites = (catalog: OMMJsonObject[]) => {
  const satellites: Satellite[] = []
  const satellitesMap: Map<number, Satellite> = new Map()
  let i = 0
  for (const omm of catalog) {
    const satellite: Satellite = {
      name: omm.OBJECT_NAME,
      norad: omm.NORAD_CAT_ID.toString(),
      omm
    }
    satellites.push(satellite)
    satellitesMap.set(i, satellite)
    i += 1
  }
  return { satellites, satellitesMap }
}

export const useSatellites = (assets: Assets) => useMemo(() => catalogToSatellites(assets.catalogs.satellites), [assets.catalogs.satellites])
