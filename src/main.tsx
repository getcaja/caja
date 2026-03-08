import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@tailwindcss/browser'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { applyTheme, getActiveTheme } from './lib/theme'

applyTheme(getActiveTheme())

// Fix macOS traffic light position after webview content loads.
// Tauri's trafficLightPosition gets reset when the webview renders.
if ('__TAURI_INTERNALS__' in window) {
  const fix = () => import('@tauri-apps/api/core').then(({ invoke }) =>
    invoke('fix_traffic_lights').catch(() => {})
  )
  fix()
  if (import.meta.hot) import.meta.hot.on('vite:afterUpdate', fix)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback="fullpage">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
