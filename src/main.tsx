import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { MissionProvider } from './context/MissionContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MissionProvider>
        <App />
      </MissionProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
