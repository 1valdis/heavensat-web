import satelliteImage from '../assets/sat.png'
import selectedSatelliteImage from '../assets/satsel.png'
import msdfImage from '../assets/msdf.png'
import { HIPStarOriginal } from '../../common/types.js'
import type MsdfDefinition from '../assets/msdf-definition.json'
import { use } from 'react'
import { OMMJsonObject } from 'satellite.js'

export type Assets = {
  textures: {
    satellite: HTMLImageElement
    selectedSatellite: HTMLImageElement
    text: HTMLImageElement
  },
  catalogs: {
    stars: HIPStarOriginal[]
    constellations: (string | number)[][]
    satellites: OMMJsonObject[]
  },
  msdfDefinition: typeof MsdfDefinition
}

function loadImage (url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(image)
    image.src = url
  })
}

export async function fetchAssets (): Promise<Assets> {
  const [satelliteLoaded, selectedSatelliteLoaded, msdfLoaded, starCatalog, constellationLineship, satelliteCatalogLoaded, msdfDefinition] = await Promise.all([
    loadImage(satelliteImage),
    loadImage(selectedSatelliteImage),
    loadImage(msdfImage),
    import('../assets/hipparcos_8_concise.json'),
    import('../assets/constellations.json'),
    import('../assets/omm.json'),
    import('../assets/msdf-definition.json')
  ])

  return {
    textures: {
      satellite: satelliteLoaded,
      selectedSatellite: selectedSatelliteLoaded,
      text: msdfLoaded
    },
    catalogs: {
      stars: starCatalog.default as HIPStarOriginal[],
      constellations: constellationLineship.default,
      satellites: satelliteCatalogLoaded.default as OMMJsonObject[]
    },
    msdfDefinition: msdfDefinition.default
  }
}

const assetsPromise = fetchAssets()
export const useAssets = () => use(assetsPromise)
