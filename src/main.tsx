import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@tailwindcss/browser'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { applyTheme, getActiveTheme } from './lib/theme'
import { invoke } from '@tauri-apps/api/core'

applyTheme(getActiveTheme())

// Fix macOS traffic light position after HMR or initial load
const fixTrafficLights = () => invoke('fix_traffic_lights').catch(() => {})
fixTrafficLights()
if (import.meta.hot) {
  import.meta.hot.on('vite:afterUpdate', fixTrafficLights)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback="fullpage">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
