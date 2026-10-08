// Sincroniza los entrenamientos de Hevy con TrackMyProgress usando la API oficial
// (solo Hevy Pro). Corre en Vercel, en el servidor: la clave de Hevy y la clave de
// servicio de Supabase nunca llegan al navegador.
//
// La llaman:
// - el cron diario de Vercel (vercel.json), con `Authorization: Bearer $CRON_SECRET`;
// - la página de Gimnasio (botón "Sincronizar ahora" y al abrirla), con el token de
//   sesión de Supabase del usuario.
//
// Variables de entorno en Vercel: HEVY_API_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
// y VITE_SUPABASE_URL (la misma que ya usa la app).

import { createClient } from '@supabase/supabase-js'
import { ADMIN_EMAIL } from '../src/lib/adminUser.js'

export const config = { maxDuration: 60 }

const HEVY_BASE = 'https://api.hevyapp.com/v1'
const EPOCH = '1970-01-01T00:00:00Z'

function madridDate(isoTime) {
  // 'en-CA' formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date(isoTime))
}

async function hevyGet(path) {
  const res = await fetch(`${HEVY_BASE}${path}`, {
    headers: { 'api-key': process.env.HEVY_API_KEY },
  })
  if (!res.ok) throw new Error(`Hevy respondió ${res.status} en ${path.split('?')[0]}`)
  return res.json()
}

async function fetchEventsSince(since) {
  const events = []
  let page = 1
  for (;;) {
    const data = await hevyGet(
      `/workouts/events?page=${page}&pageSize=10&since=${encodeURIComponent(since)}`,
    )
    events.push(...(data.events ?? []))
    if (!data.page_count || page >= data.page_count) break
    page += 1
  }
  return events
}

// Un mismo entrenamiento puede tener varios eventos (editado y luego borrado):
// solo cuenta el más reciente, para no resucitar uno borrado.
function latestEventPerWorkout(events) {
  const eventTime = (e) => new Date(e.workout?.updated_at ?? e.deleted_at ?? 0).getTime()
  const latest = new Map()
  for (const event of events) {
    const id = event.workout?.id ?? event.id
    if (!id) continue
    const current = latest.get(id)
    if (!current || eventTime(event) > eventTime(current)) latest.set(id, event)
  }
  return [...latest.values()]
}

function buildSets(workout) {
  const sets = []
  for (const exercise of workout.exercises ?? []) {
    const exerciseName = (exercise.title || '').trim()
    if (!exerciseName) continue
    for (const set of exercise.sets ?? []) {
      sets.push({
        exercise_name: exerciseName,
        set_number: (set.index ?? 0) + 1,
        reps: set.reps ?? null,
        weight_kg: set.weight_kg ?? null,
        set_type: set.type || 'normal',
        rpe: set.rpe ?? null,
        distance_km: set.distance_meters != null ? Math.round(set.distance_meters) / 1000 : null,
        duration_seconds: set.duration_seconds ?? null,
        superset_id: exercise.superset_id ?? null,
        order_index: sets.length,
      })
    }
  }
  return sets
}

// Entrenamiento que ya existe en la app para este id de Hevy. Si no hay ninguno,
// busca uno importado antes desde el CSV (su external_ref es el start_time del CSV,
// no el id) por fecha + título, para no duplicarlo.
async function findExisting(db, userId, workout, date) {
  const externalRef = `hevy:${workout.id}`
  const { data: byRef, error } = await db
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
    .eq('external_ref', externalRef)
    .maybeSingle()
  if (error) throw error
  if (byRef) return byRef.id

  const { data: sameDay, error: dayError } = await db
    .from('workouts')
    .select('id, notes, external_ref')
    .eq('user_id', userId)
    .eq('date', date)
    .not('external_ref', 'is', null)
    .not('external_ref', 'like', 'hevy:%')
  if (dayError) throw dayError

  const title = (workout.title || '').trim()
  const match = sameDay.find(
    (w) => (w.notes || '') === title || (w.notes || '').startsWith(`${title} — `),
  )
  return match?.id ?? null
}

async function upsertWorkout(db, userId, workout) {
  const date = madridDate(workout.start_time)
  const notes = [workout.title, workout.description].filter(Boolean).join(' — ') || null
  const sets = buildSets(workout)
  const existingId = await findExisting(db, userId, workout, date)

  let workoutId = existingId
  if (existingId) {
    const { error } = await db
      .from('workouts')
      .update({ date, notes, external_ref: `hevy:${workout.id}` })
      .eq('id', existingId)
    if (error) throw error
    const { error: delError } = await db.from('workout_sets').delete().eq('workout_id', existingId)
    if (delError) throw delError
  } else {
    if (sets.length === 0) return 'skipped'
    const { data, error } = await db
      .from('workouts')
      .insert({ user_id: userId, date, notes, external_ref: `hevy:${workout.id}` })
      .select('id')
      .single()
    if (error) throw error
    workoutId = data.id
  }

  if (sets.length > 0) {
    const { error } = await db
      .from('workout_sets')
      .insert(sets.map((s) => ({ ...s, workout_id: workoutId })))
    if (error) throw error
  }
  return existingId ? 'updated' : 'created'
}

// Devuelve { user } o { reason } con el motivo del rechazo, para poder diagnosticarlo.
async function resolveUser(db, req, supabaseUrl) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return { reason: 'falta el token' }

  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
    // El cron no tiene sesión: sincroniza para la cuenta dueña de la clave de Hevy.
    const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
    if (error) return { reason: `no se pudo listar usuarios: ${error.message}` }
    const user = data.users.find((u) => isAdminEmail(u.email))
    return user ? { user } : { reason: 'no existe la cuenta dueña de Hevy' }
  }

  // La sesión se comprueba con la clave pública (la misma que usa la app), que es
  // con la que Supabase emite los tokens; así no depende del tipo de clave secreta.
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const authClient = anonKey
    ? createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : db
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data?.user) return { reason: `sesión no válida (${error?.message ?? 'sin usuario'})` }
  // La clave de Hevy es de una sola cuenta: nadie más puede volcar esos datos.
  return isAdminEmail(data.user.email) ? { user: data.user } : { reason: 'esta cuenta no tiene Hevy conectado' }
}

function isAdminEmail(email) {
  return (email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.HEVY_API_KEY) {
    res.status(500).json({ error: 'Faltan variables de entorno en Vercel (ver README)' })
    return
  }

  const db = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const { user, reason } = await resolveUser(db, req, supabaseUrl)
    if (!user) {
      res.status(401).json({ error: `No autorizado: ${reason}` })
      return
    }

    const { data: state, error: stateError } = await db
      .from('hevy_sync_state')
      .select('last_synced_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (stateError) throw stateError

    // Se toma la hora antes de pedir los eventos para no perder cambios hechos
    // mientras se sincroniza (como mucho se reprocesan, y eso es idempotente).
    const startedAt = new Date().toISOString()
    const events = await fetchEventsSince(state?.last_synced_at ?? EPOCH)

    const summary = { created: 0, updated: 0, deleted: 0, skipped: 0 }
    for (const event of latestEventPerWorkout(events)) {
      if (event.type === 'updated' && event.workout) {
        summary[await upsertWorkout(db, user.id, event.workout)] += 1
      } else if (event.type === 'deleted' && event.id) {
        const { data, error } = await db
          .from('workouts')
          .delete()
          .eq('user_id', user.id)
          .eq('external_ref', `hevy:${event.id}`)
          .select('id')
        if (error) throw error
        summary.deleted += data.length
      }
    }

    const { error: saveError } = await db
      .from('hevy_sync_state')
      .upsert({ user_id: user.id, last_synced_at: startedAt, updated_at: startedAt })
    if (saveError) throw saveError

    res.status(200).json({ ok: true, syncedAt: startedAt, ...summary })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
