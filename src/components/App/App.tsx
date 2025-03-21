import { useEffect, useRef, useState } from 'react'
import { useAssets } from './assets-loader.js'
import { TopMenu } from '../TopMenu/TopMenu.js'
import { BottomBar } from '../BottomBar/BottomBar.js'
import { useTimeControls } from './use-time-controls.js'
import { Location } from '../../common/types.js'
import { Scene } from '../Scene/Scene.js'
import './App.css'
import { DeviceTimeZone, LocationControls } from '../LocationControls/LocationControls.js'
import { TimeControls } from '../TimeControls/TimeControls.js'
import { defaultFilter, SatelliteFilter, SatellitesFilter } from '../SatelliteFilter/SatellitesFilter.js'
import { SatelliteInfo } from '../SatelliteInfo/SatelliteInfo.js'
import { useSatellites } from '../Scene/use-satellites.js'

export const App = () => {
  const assets = useAssets()
  const { satellitesMap } = useSatellites(assets)
  const [location, setLocation] = useState<Location>({ latitude: 0, longitude: 0, altitude: 0, timezone: DeviceTimeZone })
  const timeControls = useTimeControls(location.timezone)
  const [selectedStarId, setSelectedStarId] = useState<number | null>(null)
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<number | null>(null)
  const [satelliteFilter, setSatelliteFilter] = useState<SatelliteFilter>(defaultFilter)
  const [satelliteNamesVisible/* , setSatelliteNamesVisible */] = useState(true)
  const topMenuRef = useRef<HTMLDivElement>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setAnchorEl(topMenuRef.current)
  }, [topMenuRef])
  // const switchSatelliteNamesVisibility = useCallback(() => setSatelliteNamesVisible(current => !current), [setSatelliteNamesVisible])

  return (
    <div className='App'>
      <TopMenu ref={topMenuRef}>
        <SatellitesFilter currentFilter={satelliteFilter} setFilter={setSatelliteFilter} />
        <SatelliteInfo anchorEl={anchorEl} location={location} selectedSatellite={satellitesMap.get(selectedSatelliteId!) ?? null} date={timeControls.date} />
      </TopMenu>
      <Scene
        assets={assets}
        date={timeControls.date}
        location={location}
        areSatelliteNamesVisible={satelliteNamesVisible}
        selectedSatelliteId={selectedSatelliteId}
        setSelectedSatelliteId={setSelectedSatelliteId}
        selectedStarId={selectedStarId}
        setSelectedStarId={setSelectedStarId}
        satelliteFilter={satelliteFilter}
      />
      <BottomBar>
        <LocationControls setLocation={setLocation} location={location} />
        <TimeControls {...timeControls} zone={location.timezone} hotkeyStep={{ seconds: 5 }} />
      </BottomBar>
    </div>
  )
}
