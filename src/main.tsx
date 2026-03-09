import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastProvider } from './hooks/useToast'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)

// ─── Register Service Worker for PWA ───────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Auto-update: when a new SW is found, tell it to activate immediately
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                // A new version is ready — optionally notify user
                console.log('[SW] New version activated');
              }
            });
          }
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}
