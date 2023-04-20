// split array into n chunks of balanced length
export function chunkify<Type> (a: Array<Type>, n: number): Array<Type[]> {
  if (n < 2) { return [a] }

  const len = a.length
  const out: Array<Type[]> = []
  let i = 0
  let size

  if (len % n === 0) {
    size = Math.floor(len / n)
    while (i < len) {
      out.push(a.slice(i, i += size))
    }
  }
  while (i < len) {
    size = Math.ceil((len - i) / n--)
    out.push(a.slice(i, i += size))
  }

  return out
}
