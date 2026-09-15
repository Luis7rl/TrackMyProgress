// Supabase Auth exige un email por dentro, pero queremos que las cuentas se
// puedan crear y usar solo con nombre de usuario. Solución: generamos un
// email "interno" a partir del username (nunca se envía nada a él, es solo
// el identificador que usa Supabase). Si alguien SÍ escribe un email real
// (con "@"), lo respetamos tal cual — así conviven las cuentas con email
// real (recuperación de contraseña por email funciona) y las de solo
// usuario (recuperación solo puede hacerla quien administre el proyecto).
const FAKE_EMAIL_DOMAIN = 'trackmyprogress.local'

export function isEmail(value) {
  return value.includes('@')
}

export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${FAKE_EMAIL_DOMAIN}`
}

export function resolveLoginEmail(identifier) {
  return isEmail(identifier) ? identifier.trim() : usernameToEmail(identifier)
}
