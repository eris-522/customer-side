import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Immediately intercept password recovery links from email before any client strips tokens
if (typeof window !== 'undefined') {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const isRecovery = hash.includes('type=recovery') || search.includes('type=recovery');

  if (isRecovery) {
    try {
      sessionStorage.setItem('supabase_recovery_mode', 'true');
    } catch {}

    if (window.location.pathname !== '/auth') {
      // Forward hash fragment intact to auth page in reset mode
      window.location.replace('/auth?mode=reset' + hash);
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
