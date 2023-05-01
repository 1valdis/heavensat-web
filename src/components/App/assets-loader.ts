import satelliteImage from './assets/sat.png'
import msdfImage from './assets/msdf.png'
import { HIPStarOriginal } from './common-types'
import type MsdfDefinition from './assets/msdf-definition.json'

export type Assets = {
  textures: {
    satellite: HTMLImageElement
    text: HTMLImageElement
  },
  catalogs: {
    stars: HIPStarOriginal[]
    constellations: (string | number)[][]
    satellites: string[]
  },
  msdfDefinition: typeof MsdfDefinition
}
type Status = 'pending' | 'rejected' | 'fulfilled'

function loadImage (url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(image)
    image.src = url
  })
}

let status: Status = 'pending'
let assets: Assets | null = null

export function fetchAssets () {
  const fetching = Promise.all([
    loadImage(satelliteImage),
    loadImage(msdfImage),
    import('./assets/hipparcos_8_concise.json'),
    import('./assets/constellations.json'),
    import('./assets/satellite-catalog.json'),
    import('./assets/msdf-definition.json')
  ]).then(([satelliteLoaded, msdfLoaded, starCatalog, constellationLineship, satelliteCatalog, msdfDefinition]) => {
    status = 'fulfilled'
    assets = {
      textures: {
        satellite: satelliteLoaded,
        text: msdfLoaded
      },
      catalogs: {
        stars: starCatalog.default as HIPStarOriginal[],
        constellations: constellationLineship.default,
        satellites: satelliteCatalog.default
      },
      msdfDefinition: msdfDefinition.default
    }
  }).catch((error) => {
    status = 'rejected'
    assets = error
  })

  // throw promise to trigger React Suspense
  // or return data
  return () => {
    if (status === 'pending') {
      throw fetching
    } else if (status === 'rejected') {
      throw assets
    }
    return assets!
  }
}

export const getAssets = fetchAssets()
