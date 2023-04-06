// TODO figure out this function to not return NaN
export function bvToRgb (bv: number): [number, number, number] {
  const temperature = 4600 * ((1 / ((0.92 * bv) + 1.7)) + (1 / ((0.92 * bv) + 0.62)))
  let red, green, blue

  if (temperature <= 6600) {
    red = 1
    green = 0.390 * Math.log10(temperature) - 0.631
  } else {
    red = 1.292 * Math.pow(temperature / 100 - 60, -0.133)
    green = 1.129 * Math.pow(temperature / 100 - 60, -0.075)
  }

  if (temperature <= 1900) {
    blue = 0
  } else if (temperature < 6600) {
    blue = -0.018 * Math.log10(temperature) - 0.258
  } else {
    blue = 0.8 * Math.pow(temperature / 100 - 60, 0.45)
  }

  // Apply gamma correction with a gamma value of 2.2
  red = Math.pow(red, 2.2)
  green = Math.pow(green, 2.2)
  blue = Math.pow(blue, 2.2)

  return [red, green, blue]
}

export function degreesToRad (degrees: number): number {
  return degrees * Math.PI / 180
}

export function raDecToCartesian (ra: number, dec: number): [number, number, number] {
  // Convert equatorial coordinates to spherical coordinates
  const theta = Math.PI / 2 - dec
  const phi = ra

  // Convert spherical coordinates to Cartesian coordinates
  const x = Math.sin(theta) * Math.cos(phi)
  const y = Math.sin(theta) * Math.sin(phi)
  const z = Math.cos(theta)

  // x y z would require
  // mat4.rotate(viewMatrix, viewMatrix, degreesToRad(-90), [1, 0, 0])
  // and lstRadians + degreesToRad(90)
  return [y, z, x]
}

export function getLocalSiderealTime (date: Date, longitude: number): number {
  // Constants
  const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0))
  const SECONDS_PER_DAY = 86400
  const DEGREES_PER_DAY = 360.985647366

  // Calculate the number of days since J2000 epoch (including fractions)
  const daysSinceJ2000 = (date.getTime() - J2000.getTime()) / (1000 * SECONDS_PER_DAY)

  // Calculate Greenwich Mean Sidereal Time (GMST) in degrees
  const GMSTdeg = (100.46061837 + DEGREES_PER_DAY * daysSinceJ2000) % 360

  // Calculate Local Sidereal Time (LST) in degrees
  const LSTdeg = (GMSTdeg + longitude) % 360

  // Convert Local Sidereal Time from degrees to radians
  return (LSTdeg * Math.PI) / 180
}
