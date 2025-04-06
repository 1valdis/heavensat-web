import { FC, memo, useMemo } from 'react'
import { degreesToRadians, eciToEcf, gstime, propagate, ecfToLookAngles, radiansToDegrees, LookAngles, PositionAndVelocity, json2satrec } from 'satellite.js'
import { Location, Satellite } from '../../common/types.js'
import { Typography } from '@mui/material'
import { getApogee, getPerigee, getPeriodMinutes } from '../../common/satellite-calculations.js'
import './Details.css'

const SatelliteDetailsFC: FC<{ location: Location, satellite: Satellite, date: Date }> = ({ location, satellite, date }) => {
  const satRec = useMemo(() => json2satrec(satellite.omm), [satellite])
  const positionEci = propagate(satRec, date) as PositionAndVelocity
  const gmst = gstime(date)
  const positionEcf = positionEci.position ? eciToEcf(positionEci.position, gmst) : null
  const locationForLib = {
    longitude: degreesToRadians(location.longitude),
    latitude: degreesToRadians(location.latitude),
    height: location.altitude / 1000
  }
  const lookAngles = positionEcf ? ecfToLookAngles(locationForLib, positionEcf) as LookAngles : null
  const cospar = satellite.omm.OBJECT_ID
  return (
    <div className='satellite-details'>
      <section style={{ gridArea: 'general' }}>
        <Typography variant='caption' color='textSecondary'>Name</Typography>
        <Typography variant='body2'>{satellite.name}</Typography>
        <Typography variant='caption' color='textSecondary'>International Designator (COSPAR)</Typography>
        <Typography variant='body2'>{cospar}</Typography>
        <Typography variant='caption' color='textSecondary'>NORAD ID</Typography>
        <Typography variant='body2'>{satellite.norad}</Typography>
      </section>
      <section style={{ gridArea: 'coordinates' }}>
        <Typography variant='caption' color='textSecondary'>Elevation</Typography>
        <Typography variant='body2'>{lookAngles ? `${radiansToDegrees(lookAngles.elevation).toFixed(3)} °` : '-'}</Typography>
        <Typography variant='caption' color='textSecondary'>Azimuth</Typography>
        <Typography variant='body2'>{lookAngles ? `${radiansToDegrees(lookAngles.azimuth).toFixed(3)} °` : '-'}</Typography>
        <Typography variant='caption' color='textSecondary'>Distance</Typography>
        <Typography variant='body2'>{lookAngles ? `${lookAngles.rangeSat.toFixed(3)} km` : '-'}</Typography>
      </section>
      <section style={{ gridArea: 'elements' }}>
        <Typography variant='caption' color='textSecondary'>Inclination</Typography>
        <Typography variant='body2'>{positionEci.meanElements ? `${radiansToDegrees(positionEci.meanElements.im).toFixed(3)} °` : '-'}</Typography>
        <Typography variant='caption' color='textSecondary'>Eccentricity</Typography>
        <Typography variant='body2'>{positionEci.meanElements ? positionEci.meanElements.em.toFixed(7) : '-'}</Typography>
        <Typography variant='caption' color='textSecondary'>Apogee height</Typography>
        <Typography variant='body2'>{positionEci.meanElements ? `${getApogee(positionEci.meanElements).toFixed(3)} km` : '-'}</Typography>
        <Typography variant='caption' color='textSecondary'>Perigee height</Typography>
        <Typography variant='body2'>{positionEci.meanElements ? `${getPerigee(positionEci.meanElements).toFixed(3)} km` : '-'}</Typography>
        <Typography variant='caption' color='textSecondary'>Period</Typography>
        <Typography variant='body2'>{positionEci.meanElements ? `${getPeriodMinutes(positionEci.meanElements).toFixed(3)} min` : '-'}</Typography>
      </section>
      {/* <section style={{ gridArea: 'position-velocity' }}>
        <Typography variant='caption'>X</Typography>
        <Typography variant='body2'>{positionEci.position ? `${positionEci.position.x.toFixed(3)} km` : '-'}</Typography>
        <Typography variant='caption'>Y</Typography>
        <Typography variant='body2'>{positionEci.position ? `${positionEci.position.y.toFixed(3)} km` : '-'}</Typography>
        <Typography variant='caption'>Z</Typography>
        <Typography variant='body2'>{positionEci.position ? `${positionEci.position.z.toFixed(3)} km` : '-'}</Typography>
        <Typography variant='caption'>Vx</Typography>
        <Typography variant='body2'>{positionEci.velocity ? `${positionEci.velocity.x.toFixed(3)} km/s` : '-'}</Typography>
        <Typography variant='caption'>Vy</Typography>
        <Typography variant='body2'>{positionEci.velocity ? `${positionEci.velocity.y.toFixed(3)} km/s` : '-'}</Typography>
        <Typography variant='caption'>Vz</Typography>
        <Typography variant='body2'>{positionEci.velocity ? `${positionEci.velocity.z.toFixed(3)} km/s` : '-'}</Typography>
        <Typography variant='caption'>Vw</Typography>
        <Typography variant='body2'>{positionEci.velocity ? `${Math.sqrt(positionEci.velocity.x ** 2 + positionEci.velocity.y ** 2 + positionEci.velocity.z ** 2).toFixed(3)} km/s` : '-'}</Typography>
      </section> */}
      <section style={{ gridArea: 'tle' }}>
        <pre>{satellite.omm['TLE_LINE0'] as string}</pre>
        <pre>{satellite.omm['TLE_LINE1'] as string}</pre>
        <pre>{satellite.omm['TLE_LINE2'] as string}</pre>
      </section>
    </div>
  )
}

export const SatelliteDetails = memo(SatelliteDetailsFC)
