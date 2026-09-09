import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const VISIBLE_LIMIT = 10
const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatPace(distanceKm, durationSeconds) {
  if (!distanceKm) return '—'
  const secPerKm = durationSeconds / distanceKm
  const min = Math.floor(secPerKm / 60)
  const sec = Math.round(secPerKm % 60)
  return `${min}:${String(sec).padStart(2, '0')} /km`
}

function WeeklyPlan() {
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('running_plan_days')
      .select('weekday, description')
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
          return
        }
        const byDay = Object.fromEntries(data.map((d) => [d.weekday, d.description ?? '']))
        setPlan(WEEKDAY_LABELS.map((_, i) => byDay[i] ?? ''))
      })
  }, [])

  async function saveDay(weekday, description) {
    const { error } = await supabase
      .from('running_plan_days')
      .upsert({ weekday, description: description.trim() || null }, { onConflict: 'user_id,weekday' })
    if (error) setError(error.message)
  }

  function updateLocal(i, value) {
    setPlan((prev) => prev.map((v, idx) => (idx === i ? value : v)))
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="mb-3 text-sm font-medium text-slate-400">Plan semanal</p>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      {plan === null ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-slate-500">{label}</span>
              <input
                type="text"
                value={plan[i]}
                placeholder="Ej. 5km ritmo suave"
                onChange={(e) => updateLocal(i, e.target.value)}
                onBlur={(e) => saveDay(i, e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm outline-none focus:border-violet-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Carrera() {
  const [sessions, setSessions] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [date, setDate] = useState(todayISO)
  const [distance, setDistance] = useState('')
  const [minutes, setMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('running_sessions')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }
    setSessions(data)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from('running_sessions').insert({
      date,
      distance_km: Number(distance),
      duration_seconds: Math.round(Number(minutes) * 60),
      notes: notes.trim() || null,
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setDistance('')
    setMinutes('')
    setNotes('')
    load()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta sesión?')) return
    const { error } = await supabase.from('running_sessions').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  const totalKm = sessions?.reduce((sum, s) => sum + Number(s.distance_km), 0) ?? 0
  const visible = expanded ? sessions : sessions?.slice(0, VISIBLE_LIMIT)
  const remaining = sessions ? sessions.length - VISIBLE_LIMIT : 0

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Carrera</h1>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-2xl font-semibold">{sessions?.length ?? '—'}</p>
          <p className="text-sm text-slate-500">Entrenamientos</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-2xl font-semibold">{totalKm.toFixed(1)} km</p>
          <p className="text-sm text-slate-500">Distancia total</p>
        </div>
      </div>

      <div className="mb-6">
        <WeeklyPlan />
      </div>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Fecha
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Km
          <input
            type="number"
            required
            min="0"
            step="0.1"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="5.0"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Minutos
          <input
            type="number"
            required
            min="0"
            step="0.1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="28.5"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-slate-400">
          Notas (opcional)
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. rodaje suave"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <h2 className="mb-3 text-sm font-medium text-slate-400">Historial</h2>

      {sessions === null && !error && <p className="text-sm text-slate-500">Cargando...</p>}
      {sessions?.length === 0 && (
        <p className="text-sm text-slate-500">Todavía no has registrado ninguna sesión.</p>
      )}

      <ul className="flex flex-col gap-2">
        {visible?.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
          >
            <div>
              <p className="font-medium">
                {new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
              {s.notes && <p className="text-sm text-slate-500">{s.notes}</p>}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span>{s.distance_km} km</span>
              <span className="text-slate-500">{formatDuration(s.duration_seconds)}</span>
              <span className="text-slate-500">{formatPace(s.distance_km, s.duration_seconds)}</span>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-slate-500 hover:text-red-400"
                aria-label="Eliminar sesión"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-4 w-full rounded-lg border border-slate-800 py-2.5 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-200"
        >
          Ver todos ({sessions.length})
        </button>
      )}
    </div>
  )
}
