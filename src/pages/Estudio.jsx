import { useEffect, useState } from 'react'
import { useConfirm } from '../context/ConfirmContext'
import { todayKey } from '../lib/dates'
import { supabase } from '../lib/supabaseClient'

const VISIBLE_LIMIT = 10
const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function formatHours(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`
}

function WeeklyPlan() {
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('study_plan_days')
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
      .from('study_plan_days')
      .upsert({ weekday, description: description.trim() || null }, { onConflict: 'user_id,weekday' })
    if (error) setError(error.message)
  }

  function updateLocal(i, value) {
    setPlan((prev) => prev.map((v, idx) => (idx === i ? value : v)))
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium text-white">Horario semanal</p>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      {plan === null ? (
        <p className="text-sm text-white">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-white">{label}</span>
              <input
                type="text"
                value={plan[i]}
                placeholder="Ej. Matemáticas 18:00-20:00"
                onChange={(e) => updateLocal(i, e.target.value)}
                onBlur={(e) => saveDay(i, e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Estudio() {
  const confirm = useConfirm()
  const [sessions, setSessions] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [date, setDate] = useState(todayKey)
  const [subject, setSubject] = useState('')
  const [minutes, setMinutes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('study_sessions')
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

    const { error } = await supabase.from('study_sessions').insert({
      date,
      subject: subject.trim() || null,
      duration_minutes: parseInt(minutes, 10),
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSubject('')
    setMinutes('')
    load()
  }

  async function handleDelete(id) {
    if (!(await confirm('¿Eliminar esta sesión?'))) return
    const { error } = await supabase.from('study_sessions').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  const totalMinutes = sessions?.reduce((sum, s) => sum + s.duration_minutes, 0) ?? 0
  const visible = expanded ? sessions : sessions?.slice(0, VISIBLE_LIMIT)
  const remaining = sessions ? sessions.length - VISIBLE_LIMIT : 0

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-500">📚 Estudio</h1>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
          <p className="text-2xl font-semibold">{sessions?.length ?? '—'}</p>
          <p className="text-sm text-white">Sesiones</p>
        </div>
        <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-600/20 via-slate-900/50 to-slate-900/50 p-4 shadow-lg shadow-violet-600/10">
          <p className="text-2xl font-semibold">{formatHours(totalMinutes)}</p>
          <p className="text-sm text-white">Horas totales</p>
        </div>
      </div>

      <div className="mb-6">
        <WeeklyPlan />
      </div>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-white">
          Fecha
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-white">
          Asignatura (opcional)
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej. Cálculo"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-white">
          Minutos
          <input
            type="number"
            required
            min="0"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="90"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar sesión'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <h2 className="mb-3 text-sm font-medium text-white">Historial</h2>

      {sessions === null && !error && <p className="text-sm text-white">Cargando...</p>}
      {sessions?.length === 0 && (
        <p className="text-sm text-white">Todavía no has registrado ninguna sesión.</p>
      )}

      <ul className="flex flex-col gap-2">
        {visible?.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 shadow-sm"
          >
            <div>
              <p className="font-medium">
                {new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
              {s.subject && <p className="text-sm text-white">{s.subject}</p>}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span>{formatHours(s.duration_minutes)}</span>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-white hover:text-red-400"
                aria-label="Eliminar sesión"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-4 w-full rounded-lg border border-slate-800 py-2.5 text-sm text-white hover:border-slate-600 hover:text-slate-200"
        >
          {expanded ? 'Ver menos' : `Ver todas (${sessions.length})`}
        </button>
      )}
    </div>
  )
}
