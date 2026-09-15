// Captura el evento "beforeinstallprompt" (Android/Chrome) en cuanto el
// navegador lo dispara, para poder lanzarlo más tarde desde un botón en
// Ajustes en vez de depender del menú del navegador. En iPhone/Safari este
// evento no existe: ahí solo podemos explicar los pasos manuales.
let deferredPrompt = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
})

export function canPromptInstall() {
  return deferredPrompt != null
}

export async function promptInstall() {
  if (!deferredPrompt) return null
  deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  return choice.outcome
}
