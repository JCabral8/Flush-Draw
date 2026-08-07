import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useGame } from './store'
import './styles.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('missing #root')
createRoot(rootEl).render(<App />)

// Test/debug bridge (read-only store handle; used by tools/smoke.ts).
declare global {
  interface Window {
    __pg?: typeof useGame
  }
}
window.__pg = useGame
