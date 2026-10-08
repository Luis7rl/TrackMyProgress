// Recibe los pasos del día desde un Atajo de iPhone con una sola petición:
//   https://<tu-app>/api/pasos?pasos=8432&clave=<tu-clave>
// (opcional &fecha=AAAA-MM-DD; si no, se usa el día de hoy en Madrid).
// Guarda con la función log_steps_webhook (migraciones 003 y 017), que comprueba la clave
// guardada en webhook_secrets y escribe en la cuenta del dueño.

import { createClient } from '@supabase/supabase-js'

function madridToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
}

// El Atajo puede mandar el número con formato español ("8.432" o "8432,0").
export function parseSteps(value) {
  const text = String(value ?? '').trim().replace(/\s/g, '')
  if (!text) return null
  if (/^\d{1,3}([.,]\d{3})+$/.test(text)) return Number(text.replace(/[.,]/g, ''))
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

export default async function handler(req, res) {
  const params = { ...(req.query ?? {}), ...(typeof req.body === 'object' ? req.body : {}) }
  const steps = parseSteps(params.pasos ?? params.steps)
  const date = params.fecha || madridToday()
  const secret = params.clave || params.key

  if (steps === null) {
    res.status(400).send('Falta el número de pasos (?pasos=...)')
    return
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).send('Fecha no válida, usa AAAA-MM-DD')
    return
  }
  if (!secret) {
    res.status(401).send('Falta la clave (&clave=...)')
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const db = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await db.rpc('log_steps_webhook', {
    p_date: date,
    p_steps: steps,
    p_secret: String(secret),
  })
  if (error) {
    const unauthorized = /unauthorized/.test(error.message)
    res.status(unauthorized ? 401 : 500).send(unauthorized ? 'Clave incorrecta' : `Error: ${error.message}`)
    return
  }

  res.status(200).send(`Guardados ${steps} pasos del ${date}`)
}
