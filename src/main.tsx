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
