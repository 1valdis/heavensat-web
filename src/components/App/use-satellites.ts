import { useState } from 'react'
import { Assets } from './assets-loader'
import { Satellite } from './common-types.js'

export const useSatellites = (assets: Assets) => {
  const [{ satellites, satellitesMap }] = useState<{ satellites: Satellite[], satellitesMap: Map<number, Satellite>}>(() => {
    const satellites: Satellite[] = []
    const satellitesMap: Map<number, Satellite> = new Map()
    const catalogLines = assets.catalogs.satellites
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
  })
  return { satellites, satellitesMap }
}
