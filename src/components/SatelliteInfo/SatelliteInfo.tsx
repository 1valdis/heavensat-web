import { FC, memo } from 'react'
import { Paper, Popper } from '@mui/material'
import { Location, Satellite } from '../../common/types.js'
import { SatelliteDetails } from './Details.js'

const SatelliteInfoFC: FC<{
  selectedSatellite: Satellite | null
  date: Date
  anchorEl: HTMLElement | null
  location: Location
}> = ({
  selectedSatellite,
  date,
  anchorEl,
  location
}) => {
  const open = !!selectedSatellite

  if (!anchorEl) { return <></> }

  return (
    <Popper open={open} anchorEl={anchorEl} placement='bottom-end'>
      <Paper sx={{ p: '2ch' }}>
        {selectedSatellite && <SatelliteDetails satellite={selectedSatellite} date={date} location={location} />}
      </Paper>
    </Popper>
  )
}

export const SatelliteInfo = memo(SatelliteInfoFC)
