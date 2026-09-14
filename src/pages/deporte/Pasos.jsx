import { useEffect, useMemo, useState } from 'react'
import { mondayOf, toDateKey, todayKey } from '../../lib/dates'
import { DEFAULT_GOALS, fetchGoals } from '../../lib/goals'
import { supabase } from '../../lib/supabaseClient'

// Estimación aproximada, no personalizada por peso/altura.
const KCAL_PER_STEP = 0.04

function estimateKcal(steps) {
  return Math.round(steps * KCAL_PER_STEP)
}

function dailyPoints(entries) {
  return entries.map((e) => ({
    key: e.date,
    label: new Date(`${e.date}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    fullLabel: new Date(`${e.date}T00:00:00`).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    value: e.steps,
  }))
}

function weeklyPoints(entries) {
  const map = new Map()
  entries.forEach((e) => {
    const weekStart = toDateKey(mondayOf(`${e.date}T00:00:00`))
    map.set(weekStart, (map.get(weekStart) ?? 0) + e.steps)
  })
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, value]) => {
      const start = new Date(`${weekStart}T00:00:00`)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return {
        key: weekStart,
        label: start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        fullLabel: `Semana del ${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
        value,
      }
    })
}

function monthlyPoints(entries) {
  const map = new Map()
  entries.forEach((e) => {
    const monthKey = e.date.slice(0, 7)
    map.set(monthKey, (map.get(monthKey) ?? 0) + e.steps)
  })
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, value]) => {
      const [y, m] = monthKey.split('-').map(Number)
      const d = new Date(y, m - 1, 1)
      return {
        key: monthKey,
        label: d.toLocaleDateString('es-ES', { month: 'short' }),
        fullLabel: d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        value,
      }
    })
}

const VIEWS = [
  { id: 'day', label: 'Día', build: dailyPoints },
  { id: 'week', label: 'Semana', build: weeklyPoints },
  { id: 'month', label: 'Mes', build: monthlyPoints },
]

function BarChart({ points, unit, goalLine }) {
  const width = 600
  const height = 220
  const padding = 20
  const labelHeight = 24

  const { bars, goalY } = useMemo(() => {
    if (points.length === 0) return { bars: [], goalY: null }
    const max = Math.max(...points.map((p) => p.value), goalLine ?? 0, 1)
    const chartHeight = height - padding - labelHeight
    const barWidth = (width - padding * 2) / points.length

    const bars = points.map((p, i) => {
      const barHeight = (p.value / max) * chartHeight
      const x = padding + i * barWidth
      const y = padding + (chartHeight - barHeight)
      return { x, y, height: barHeight, width: barWidth * 0.6, ...p }
    })

    const goalY = goalLine ? padding + (chartHeight - (goalLine / max) * chartHeight) : null

    return { bars, goalY }
  }, [points, goalLine])

  if (bars.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Añade al menos un registro para ver la gráfica.
      </p>
    )
  }

  // Evita amontonar etiquetas: muestra como mucho ~8 en el eje.
  const labelEvery = Math.max(1, Math.ceil(points.length / 8))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {bars.map((b, i) => (
        <g key={b.key}>
          <rect x={b.x} y={b.y} width={b.width} height={Math.max(b.height, 1)} rx="3" fill="#8b5cf6">
            <title>
              {b.fullLabel}: {b.value.toLocaleString('es-ES')} {unit}
            </title>
          </rect>
          {i % labelEvery === 0 && (
            <text
              x={b.x + b.width / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize="9"
              fill="#94a3b8"
            >
              {b.label}
            </text>
          )}
        </g>
      ))}
      {goalY != null && (
        <g>
          <line
            x1={padding}
            y1={goalY}
            x2={width - padding}
            y2={goalY}
            stroke="#facc15"
            strokeWidth="1"
            strokeDasharray="4 3"
          >
            <title>Objetivo: {goalLine.toLocaleString('es-ES')} {unit}</title>
          </line>
          <text x={width - padding} y={goalY - 4} textAnchor="end" fontSize="9" fill="#facc15">
            {goalLine.toLocaleString('es-ES')}
          </text>
        </g>
      )}
    </svg>
  )
}

export default function Steps() {
  const [entries, setEntries] = useState(null)
  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [chartView, setChartView] = useState('day')
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

  const chartPoints = useMemo(() => {
    if (!entries) return []
    const view = VIEWS.find((v) => v.id === chartView)
    return view.build(entries)
  }, [entries, chartView])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-100">Pasos</h1>

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
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
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
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
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
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
              <p className="text-2xl font-semibold">{sorted[0].steps.toLocaleString('es-ES')}</p>
              <p className="text-sm text-slate-500">
                Último registro ({new Date(sorted[0].date + 'T00:00:00').toLocaleDateString('es-ES')})
              </p>
              <p className="mt-1 text-xs text-violet-500">
                ≈ {estimateKcal(sorted[0].steps).toLocaleString('es-ES')} kcal
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
              <p className="text-2xl font-semibold">{totalSteps.toLocaleString('es-ES')}</p>
              <p className="text-sm text-slate-500">Total acumulado</p>
              <p className="mt-1 text-xs text-violet-500">
                ≈ {estimateKcal(totalSteps).toLocaleString('es-ES')} kcal
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
            <p className="text-lg font-semibold">{avg7?.toLocaleString('es-ES') ?? '—'}</p>
            <p className="text-sm text-slate-500">Media de los últimos {last7.length} días</p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">Evolución</p>
              <div className="flex gap-1">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setChartView(v.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      chartView === v.id
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <BarChart
              points={chartPoints}
              unit="pasos"
              goalLine={chartView === 'day' ? goals.target_daily_steps : null}
            />
          </div>

          <ul className="flex flex-col gap-2">
            {sorted.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 shadow-sm"
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
