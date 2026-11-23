import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import AccountProvider from './components/AccountProvider.tsx'
import CloudProgressProvider from './components/CloudProgressProvider.tsx'
import { retireLocalProgress } from './game/soloSave.ts'
import { cleanAccountUrl, restoreAccountInvite, sessionStore } from './online/browserState.ts'

try {
  const restored = restoreAccountInvite(location.href, sessionStore)
  if (restored !== location.href) history.replaceState(history.state, '', restored)
} catch { /* Casual play works even when browser storage is blocked. */ }

retireLocalProgress()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountProvider><CloudProgressProvider><App /></CloudProgressProvider></AccountProvider>
    <Analytics beforeSend={(event) => {
      return { ...event, url: cleanAccountUrl(new URL(event.url, window.location.origin).toString(), true) }
    }} />
  </StrictMode>,
)
