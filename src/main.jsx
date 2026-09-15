import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ConfirmProvider } from './context/ConfirmContext.jsx'
import './index.css'

// Comprueba si hay una versión nueva desplegada y, si la hay, la activa y
// recarga sola. Sin esto, un Service Worker antiguo puede quedarse serviendo
// una versión vieja de la app indefinidamente en un navegador que no vuelve
// a comprobarlo.
//
// En una PWA instalada en el móvil (iOS sobre todo) no hay nada en segundo
// plano mientras la app está cerrada, así que un intervalo por tiempo no
// sirve de mucho: lo que de verdad importa es comprobarlo cada vez que se
// abre o se vuelve a primer plano la app.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    const checkForUpdate = () => registration.update()

    setInterval(checkForUpdate, 60 * 60 * 1000)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    })
  },
  onNeedRefresh() {
    updateSW(true)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </AuthProvider>
  </StrictMode>,
)
