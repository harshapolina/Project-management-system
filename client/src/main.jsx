import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, useUiStore } from './store/uiStore'

function ThemeBoot() {
  const theme = useUiStore((s) => s.theme)
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return undefined
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])
  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeBoot />
    <App />
  </StrictMode>,
)
