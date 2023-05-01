import type font from './msdf-definition.json'

type CharInfo = (typeof font)['chars'][0];

export type MsdfGeometry = {
  width: number;
  chars: {
      iXY: [number, number];
      iUV: [number, number];
      iSize: [number, number];
  }[];
}

export class MsdfGeometryBuilder {
  private charMap = new Map<string, CharInfo>()
  private kerningsMap = new Map<string, number>()

  constructor (definition: typeof font) {
    definition.chars.forEach((char) => {
      this.charMap.set(char.char, char)
    })
    definition.kernings.forEach((kerning) => {
      this.kerningsMap.set(`${kerning.first},${kerning.second}`, kerning.amount)
    })
  }

  textToGeometry (text: string): MsdfGeometry {
    return text.split('').map(char => {
      return this.charMap.get(char) ?? this.charMap.get('?')!
    }).reduce((r, char, i, chars) => {
      let kerning = 0

      if (i !== 0) {
        const previous = chars[i - 1]!
        kerning = this.kerningsMap.get(`${previous.id},${char.id}`) ?? 0
      }

      r.chars.push({
        // top left position on result canvas
        iXY: [
          r.width + char.xoffset + kerning,
          char.yoffset
        ],
        // top left (?) position on msdf texture
        iUV: [char.x, char.y],
        // size on msdf texture
        iSize: [char.width, char.height]
      })
      r.width += char.xadvance + kerning
      return r
    }, {
      width: 0,
      chars: []
    } as {
        width: number;
        chars: {
            iXY: [number, number];
            iUV: [number, number];
            iSize: [number, number];
        }[];
    })
  }
}
