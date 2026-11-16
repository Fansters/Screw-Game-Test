import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics beforeSend={(event) => {
      const url = new URL(event.url, window.location.origin)
      url.searchParams.delete('room')
      return { ...event, url: url.toString() }
    }} />
  </StrictMode>,
)
