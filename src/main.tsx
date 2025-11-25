import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // DISABLED StrictMode to prevent double-renders causing focus loss
  // <StrictMode>
    <App />
  // </StrictMode>,
)
