// Puerta de acceso a funciones "solo para mí" (ej. Recompensas): no es un
// control de seguridad real (RLS ya aísla los datos de cada cuenta), es solo
// para que el resto de gente ni vea la pestaña ni pueda navegar a la página.
const ADMIN_EMAIL = 'luisherrero1bcsa@gmail.com'

export function isAdmin(user) {
  return user?.email === ADMIN_EMAIL
}
