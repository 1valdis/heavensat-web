import { useMemo } from 'react'
import { Assets } from '../App/assets-loader'
import { Satellite } from '../common-types.js'

const catalogLinesToSatellites = (catalogLines: string[]) => {
  const satellites: Satellite[] = []
  const satellitesMap: Map<number, Satellite> = new Map()
  for (let i = 0; i < catalogLines.length; i += 3) {
    const satellite: Satellite = {
      name: catalogLines[i]!.slice(2),
      norad: catalogLines[i + 1]!.slice(2, 7),
      '3leLines': [catalogLines[i]!, catalogLines[i + 1]!, catalogLines[i + 2]!]
    }
    satellites.push(satellite)
    satellitesMap.set(i / 3, satellite)
  }
  return { satellites, satellitesMap }
}

export const useSatellites = (assets: Assets) => useMemo(() => catalogLinesToSatellites(assets.catalogs.satellites), [assets.catalogs.satellites])
