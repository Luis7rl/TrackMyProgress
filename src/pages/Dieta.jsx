import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const VISIBLE_LIMIT = 10

// Estimaciones aproximadas de kcal quemadas por actividad (no incluyen el
// metabolismo basal, solo el gasto extra de pasos + carrera + gimnasio).
const KCAL_PER_STEP = 0.04
const GYM_SESSION_KCAL = 300
const RUNNING_KCAL_PER_KM_PER_KG = 1.0
const DEFAULT_WEIGHT_KG = 75

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function CaloriesChart({ entries }) {
  const width = 600
  const height = 180
  const padding = 24

  const points = useMemo(() => {
    if (entries.length < 2) return []
    const values = entries.map((e) => e.calories)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    return entries.map((e, i) => {
      const x = padding + (i / (entries.length - 1)) * (width - padding * 2)
      const y = height - padding - ((e.calories - min) / range) * (height - padding * 2)
      return { x, y, ...e }
    })
  }, [entries])

  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Añade al menos dos registros para ver la gráfica.
      </p>
    )
  }

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <path d={path} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#8b5cf6" />
      ))}
    </svg>
  )
}

export default function Dieta() {
  const [entries, setEntries] = useState(null)
  const [activity, setActivity] = useState(null) // { stepsByDate, kmByDate, gymByDate, weightKg }
  const [expanded, setExpanded] = useState(false)
  const [date, setDate] = useState(todayISO)
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [dietRes, stepsRes, runningRes, workoutsRes, weightRes] = await Promise.all([
      supabase.from('diet_logs').select('*').order('date', { ascending: true }),
      supabase.from('step_logs').select('date, steps'),
      supabase.from('running_sessions').select('date, distance_km'),
      supabase.from('workouts').select('date'),
      supabase
        .from('body_weight_logs')
        .select('weight_kg')
        .order('date', { ascending: false })
        .limit(1),
    ])

    const err = dietRes.error || stepsRes.error || runningRes.error || workoutsRes.error || weightRes.error
    if (err) {
      setError(err.message)
      return
    }

    setEntries(dietRes.data)

    const stepsByDate = {}
    stepsRes.data.forEach((s) => (stepsByDate[s.date] = s.steps))

    const kmByDate = {}
    runningRes.data.forEach((r) => (kmByDate[r.date] = (kmByDate[r.date] ?? 0) + Number(r.distance_km)))

    const gymByDate = {}
    workoutsRes.data.forEach((w) => (gymByDate[w.date] = (gymByDate[w.date] ?? 0) + 1))

    setActivity({
      stepsByDate,
      kmByDate,
      gymByDate,
      weightKg: weightRes.data[0]?.weight_kg ?? DEFAULT_WEIGHT_KG,
    })
  }

  useEffect(() => {
    load()
  }, [])

  function estimateBurn(date) {
    if (!activity) return 0
    const steps = activity.stepsByDate[date] ?? 0
    const km = activity.kmByDate[date] ?? 0
    const gymSessions = activity.gymByDate[date] ?? 0
    return Math.round(
      steps * KCAL_PER_STEP + km * activity.weightKg * RUNNING_KCAL_PER_KM_PER_KG + gymSessions * GYM_SESSION_KCAL,
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from('diet_logs').upsert(
      {
        date,
        calories: parseInt(calories, 10),
        protein_g: protein ? Number(protein) : null,
        carbs_g: carbs ? Number(carbs) : null,
        fat_g: fat ? Number(fat) : null,
      },
      { onConflict: 'user_id,date' },
    )

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    load()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    const { error } = await supabase.from('diet_logs').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  const sorted = entries ? [...entries].sort((a, b) => b.date.localeCompare(a.date)) : []
  const last7 = sorted.slice(0, 7)
  const avg7 = last7.length
    ? Math.round(last7.reduce((sum, e) => sum + e.calories, 0) / last7.length)
    : null
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_LIMIT)
  const remaining = sorted.length - VISIBLE_LIMIT

  const latestBurn = sorted[0] ? estimateBurn(sorted[0].date) : null
  const latestNet = sorted[0] ? sorted[0].calories - latestBurn : null

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Dieta</h1>

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
          Kcal
          <input
            type="number"
            required
            min="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="2200"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Proteína (g)
          <input
            type="number"
            min="0"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="150"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Carbs (g)
          <input
            type="number"
            min="0"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="220"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Grasa (g)
          <input
            type="number"
            min="0"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="70"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
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

      {entries === null ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no has registrado ningún día.</p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-2xl font-semibold">
                {sorted[0].calories.toLocaleString('es-ES')} kcal
              </p>
              <p className="text-sm text-slate-500">
                Consumidas ({new Date(sorted[0].date + 'T00:00:00').toLocaleDateString('es-ES')})
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-2xl font-semibold">{avg7?.toLocaleString('es-ES') ?? '—'} kcal</p>
              <p className="text-sm text-slate-500">Media últimos {last7.length} días</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-2xl font-semibold text-violet-400">
                {latestBurn?.toLocaleString('es-ES') ?? '—'} kcal
              </p>
              <p className="text-sm text-slate-500">Quemadas en actividad (pasos + carrera + gimnasio)</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p
                className={`text-2xl font-semibold ${
                  latestNet == null ? '' : latestNet > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {latestNet == null ? '—' : `${latestNet > 0 ? '+' : ''}${latestNet.toLocaleString('es-ES')}`} kcal
              </p>
              <p className="text-sm text-slate-500">Neto (consumidas − actividad)</p>
            </div>
          </div>

          <p className="mb-6 text-xs text-slate-600">
            Las kcal quemadas son una estimación (pasos, distancia de carrera y ~{GYM_SESSION_KCAL} kcal por
            sesión de gimnasio) y no incluyen el metabolismo basal, así que el "neto" no es tu balance
            calórico real — sirve solo como referencia relativa día a día.
          </p>

          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <CaloriesChart entries={entries} />
          </div>

          <ul className="flex flex-col gap-2">
            {visible.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
              >
                <span className="text-sm">
                  {new Date(entry.date + 'T00:00:00').toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{entry.calories} kcal</span>
                  <span className="text-slate-500">−{estimateBurn(entry.date)}</span>
                  {(entry.protein_g || entry.carbs_g || entry.fat_g) && (
                    <span className="hidden text-slate-500 sm:inline">
                      P {entry.protein_g ?? '—'} · C {entry.carbs_g ?? '—'} · G {entry.fat_g ?? '—'}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-slate-500 hover:text-red-400"
                    aria-label="Eliminar registro"
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
              Ver todos ({sorted.length})
            </button>
          )}
        </>
      )}
    </div>
  )
}
