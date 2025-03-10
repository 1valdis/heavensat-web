export function bvToRgb (bv: number): [number, number, number] {
  // Clamp B–V index to the valid range
  if (bv < -0.4) bv = -0.4
  if (bv > 2.0) bv = 2.0

  let r: number, g: number, b: number, t: number

  if (bv < 0.0) {
    t = (bv + 0.4) / (0.0 + 0.4)
    r = 0.61 + 0.11 * t + 0.1 * t * t
  } else if (bv < 0.4) {
    t = (bv - 0.0) / (0.4 - 0.0)
    r = 0.83 + 0.17 * t
  } else {
    r = 1.0
  }

  if (bv < -0.4) {
    t = (bv + 0.4) / (0.0 + 0.4)
    g = 0.70 + 0.07 * t + 0.1 * t * t
  } else if (bv < 0.4) {
    t = (bv - 0.0) / (0.4 - 0.0)
    g = 0.87 + 0.11 * t
  } else if (bv < 1.6) {
    t = (bv - 0.4) / (1.6 - 0.4)
    g = 0.98 - 0.16 * t
  } else if (bv < 2.0) {
    t = (bv - 1.6) / (2.0 - 1.6)
    g = 0.82 - 0.5 * t * t
  } else {
    g = 0.62
  }

  if (bv < -0.4) {
    b = 1.0
  } else if (bv < 0.4) {
    b = 1.0
  } else if (bv < 1.5) {
    t = (bv - 0.4) / (1.5 - 0.4)
    b = 1.0 - 0.47 * t + 0.1 * t * t
  } else if (bv < 1.94) {
    t = (bv - 1.5) / (1.94 - 1.5)
    b = 0.63 - 0.6 * t * t
  } else {
    b = 0.0
  }

  const contrastFactor = 2
  // Calculate luminance using standard coefficients
  const L = 0.299 * r + 0.587 * g + 0.114 * b

  // Boost each channel's deviation from luminance
  r = L + contrastFactor * (r - L)
  g = L + contrastFactor * (g - L)
  b = L + contrastFactor * (b - L)

  return [Math.min(1, Math.max(0, r)), Math.min(1, Math.max(0, g)), Math.min(1, Math.max(0, b))]
}

export function degreesToRad (degrees: number): number {
  return degrees * Math.PI / 180
}

export function raDecToCartesian (ra: number, dec: number): [number, number, number] {
  const x = Math.cos(ra) * Math.cos(dec)
  const y = Math.sin(ra) * Math.cos(dec)
  const z = Math.sin(dec)

  return [x, y, z]
}

export function lookAnglesToCartesian (elevation: number, azimuth: number): [number, number, number] {
  const x = Math.cos(elevation) * Math.cos(azimuth)
  const y = -Math.cos(elevation) * Math.sin(azimuth)
  const z = Math.sin(elevation)

  return [y, z, x]
}

export function decimalYear (date: Date) {
  const y = date.getUTCFullYear()
  const start = Date.UTC(y, 0, 1) // Start of UTC year
  const end = Date.UTC(y + 1, 0, 1) // Start of following UTC year
  return y + (+date - start) / (end - start)
}
