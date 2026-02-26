import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@tailwindcss/browser'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { applyTheme, getActiveTheme } from './lib/theme'

applyTheme(getActiveTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback="fullpage">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
