import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PreferencesProvider } from './PreferencesProvider'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider><App /></PreferencesProvider>
  </StrictMode>,
)
