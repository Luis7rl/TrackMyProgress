import { useEffect, useMemo, useState } from 'react'
import ProgressBar from '../../components/ProgressBar'
import { todayKey } from '../../lib/dates'
import { DEFAULT_GOALS, fetchGoals, saveGoal } from '../../lib/goals'
import { supabase } from '../../lib/supabaseClient'

// Estimación aproximada, no personalizada por peso/altura.
const KCAL_PER_STEP = 0.04

function estimateKcal(steps) {
  return Math.round(steps * KCAL_PER_STEP)
}

function StepsChart({ entries }) {
  const width = 600
  const height = 180
  const padding = 24

  const bars = useMemo(() => {
    if (entries.length === 0) return []
    const max = Math.max(...entries.map((e) => e.steps), 1)
    const barWidth = (width - padding * 2) / entries.length

    return entries.map((e, i) => {
      const barHeight = (e.steps / max) * (height - padding * 2)
      const x = padding + i * barWidth
      const y = height - padding - barHeight
      return { x, y, height: barHeight, width: barWidth * 0.7, ...e }
    })
  }, [entries])

  if (bars.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Añade al menos un registro para ver la gráfica.
      </p>
    )
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.width} height={b.height} rx="2" fill="#8b5cf6" />
      ))}
    </svg>
  )
}

export default function Steps() {
  const [entries, setEntries] = useState(null)
  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [date, setDate] = useState(todayKey)
  const [steps, setSteps] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('step_logs')
      .select('*')
      .order('date', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }
    setEntries(data)
  }

  useEffect(() => {
    load()
    fetchGoals()
      .then(setGoals)
      .catch((err) => setError(err.message))
  }, [])

  async function handleGoalBlur(value) {
    const num = value === '' ? null : parseInt(value, 10)
    setGoals((g) => ({ ...g, target_daily_steps: num }))
    try {
      await saveGoal('target_daily_steps', num)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase
      .from('step_logs')
      .upsert({ date, steps: parseInt(steps, 10) }, { onConflict: 'user_id,date' })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSteps('')
    load()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro de pasos?')) return
    const { error } = await supabase.from('step_logs').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  const sorted = entries ? [...entries].sort((a, b) => b.date.localeCompare(a.date)) : []
  const last7 = sorted.slice(0, 7)
  const avg7 = last7.length ? Math.round(last7.reduce((sum, e) => sum + e.steps, 0) / last7.length) : null
  const totalSteps = entries?.reduce((sum, e) => sum + e.steps, 0) ?? 0
  const todayEntry = entries?.find((e) => e.date === todayKey())
  const relevantSteps = todayEntry?.steps ?? 0
  const goalPercent =
    goals.target_daily_steps ? Math.max(0, Math.min(100, (relevantSteps / goals.target_daily_steps) * 100)) : null

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Pasos</h1>

      <p className="mb-6 text-sm text-slate-500">
        Se rellena solo cada día si configuras el Atajo de iPhone, pero también puedes
        añadir o corregir un registro a mano.
      </p>

      <form onSubmit={handleSubmit} className="mb-6 flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Fecha
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-slate-400">
          Pasos
          <input
            type="number"
            required
            min="0"
            step="1"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="Ej. 8500"
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

      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-slate-400">Objetivo diario</span>
          <div className="flex items-center gap-1 text-sm">
            <input
              type="number"
              step="500"
              defaultValue={goals.target_daily_steps ?? ''}
              key={goals.target_daily_steps}
              onBlur={(e) => handleGoalBlur(e.target.value)}
              className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-right outline-none focus:border-violet-500"
            />
            <span className="text-slate-500">pasos</span>
          </div>
        </div>
        {goalPercent != null ? (
          <>
            <ProgressBar percent={goalPercent} />
            <p className="mt-2 text-xs text-slate-500">
              {relevantSteps.toLocaleString('es-ES')} / {goals.target_daily_steps.toLocaleString('es-ES')} hoy
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500">Sin objetivo definido.</p>
        )}
      </div>

      {entries === null ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no has registrado ningún día.</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-2xl font-semibold">{sorted[0].steps.toLocaleString('es-ES')}</p>
              <p className="text-sm text-slate-500">
                Último registro ({new Date(sorted[0].date + 'T00:00:00').toLocaleDateString('es-ES')})
              </p>
              <p className="mt-1 text-xs text-violet-400">
                ≈ {estimateKcal(sorted[0].steps).toLocaleString('es-ES')} kcal
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-2xl font-semibold">{totalSteps.toLocaleString('es-ES')}</p>
              <p className="text-sm text-slate-500">Total acumulado</p>
              <p className="mt-1 text-xs text-violet-400">
                ≈ {estimateKcal(totalSteps).toLocaleString('es-ES')} kcal
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-lg font-semibold">{avg7?.toLocaleString('es-ES') ?? '—'}</p>
            <p className="text-sm text-slate-500">Media de los últimos {last7.length} días</p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <StepsChart entries={entries} />
          </div>

          <ul className="flex flex-col gap-2">
            {sorted.map((entry) => (
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
                <div className="flex items-center gap-3">
                  <span className="font-medium">{entry.steps.toLocaleString('es-ES')}</span>
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
        </>
      )}
    </div>
  )
}
