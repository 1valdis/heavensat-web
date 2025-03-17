// import { scan } from 'react-scan'
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { App } from './components/App/App.js'
import { CircularProgress, createTheme, CssBaseline, Skeleton, ThemeProvider } from '@mui/material'

// scan()

const darkTheme = createTheme({
  palette: {
    mode: 'dark'
  }
})

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)
root.render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={
        <div style={{ display: 'grid', gridTemplateRows: 'min-content minmax(0, 1fr) min-content', gridTemplateColumns: '100vw', height: '100vh', minHeight: '100vh' }}>
          <Skeleton sx={{ bgcolor: 'black' }} variant='rectangular' width='100%' height='4ch' />
          <div style={{ display: 'grid', placeItems: 'center center' }}><CircularProgress /></div>
          <Skeleton sx={{ bgcolor: 'black' }} variant='rectangular' width='100%' height='10ch' />
        </div>
    }
      >
        <App />
      </Suspense>
    </ThemeProvider>
  </React.StrictMode>
)
