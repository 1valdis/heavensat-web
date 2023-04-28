import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './components/App/App'

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)
root.render(
  <React.StrictMode>
    <Suspense fallback={
      <div className='loading'><div>Loading</div></div>
    }>
      <App />
    </Suspense>
  </React.StrictMode>
)
