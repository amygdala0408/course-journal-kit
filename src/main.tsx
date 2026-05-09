import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { runMigrations } from './utils/storage'
import { installSyncListeners } from './utils/sync'

// Kick off one-time migrations (e.g. moving attachments from localStorage to
// IndexedDB). Failures are non-fatal; the app still mounts.
void runMigrations();

// Hook up Supabase sync if env vars are configured. No-op otherwise.
installSyncListeners();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
