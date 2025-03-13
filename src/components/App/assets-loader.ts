import satelliteImage from '../assets/sat.png'
import msdfImage from '../assets/msdf.png'
import satelliteCatalog from '../assets/3le.txt?url'
import { HIPStarOriginal } from '../common-types.js'
import type MsdfDefinition from '../assets/msdf-definition.json'

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

function loadImage (url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(image)
    image.src = url
  })
}

export async function fetchAssets (): Promise<Assets> {
  const [satelliteLoaded, msdfLoaded, starCatalog, constellationLineship, satelliteCatalogLoaded, msdfDefinition] = await Promise.all([
    loadImage(satelliteImage),
    loadImage(msdfImage),
    import('../assets/hipparcos_8_concise.json'),
    import('../assets/constellations.json'),
    fetch(satelliteCatalog).then(r => r.text()),
    import('../assets/msdf-definition.json')
  ])

  return {
    textures: {
      satellite: satelliteLoaded,
      text: msdfLoaded
    },
    catalogs: {
      stars: starCatalog.default as HIPStarOriginal[],
      constellations: constellationLineship.default,
      satellites: satelliteCatalogLoaded.split('\r\n').slice(0, -1)
    },
    msdfDefinition: msdfDefinition.default
  }
}
