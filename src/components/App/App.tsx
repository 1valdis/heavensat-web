import { use, useState } from 'react'
import { fetchAssets } from './assets-loader.js'
import { TopMenu } from '../TopMenu/TopMenu.js'
import { BottomControls } from '../BottomControls/BottomControls.js'
import { useTimeControls } from './use-time-controls.js'
import { Location } from '../common-types.js'
import { Scene } from '../Scene/Scene.js'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import './App.css'

const darkTheme = createTheme({
  palette: {
    mode: 'dark'
  }
})

const assetsPromise = fetchAssets()

export const App = () => {
  const assets = use(assetsPromise)
  const { start, stop, isPlaying, date, setDate } = useTimeControls()
  const [location, setLocation] = useState<Location>({ latitude: 0, longitude: 0, altitude: 0 })
  const [selectedStarId, setSelectedStarId] = useState<number | null>(null)
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<number | null>(null)
  const [satelliteNamesVisible, setSatelliteNamesVisible] = useState(true)
  // const switchSatelliteNamesVisibility = useCallback(() => setSatelliteNamesVisible(current => !current), [setSatelliteNamesVisible])

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className='App'>
        <TopMenu />
        <Scene
          assets={assets}
          date={date}
          location={location}
          areSatelliteNamesVisible={satelliteNamesVisible}
          selectedSatelliteId={selectedSatelliteId}
          setSelectedSatelliteId={setSelectedSatelliteId}
          selectedStarId={selectedStarId}
          setSelectedStarId={setSelectedStarId}
        />
        <BottomControls date={date} start={start} stop={stop} setDate={setDate} isPlaying={isPlaying} location={location} zone='Europe/Kiev' />
      </div>
    </ThemeProvider>
  )
}
