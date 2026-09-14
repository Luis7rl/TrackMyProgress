import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_WEIGHT_KG, GYM_SESSION_KCAL, estimateBurn } from '../lib/calorieEstimate'
import { todayKey } from '../lib/dates'
import { supabase } from '../lib/supabaseClient'

const VISIBLE_LIMIT = 10
const TARGET_CALORIES = 2200

function NetChart({ entries, burnForDate, target }) {
  const width = 600
  const height = 210
  const sidePad = 24
  const topPad = 22
  const bottomLabelHeight = 22

  const points = useMemo(() => {
    if (entries.length < 2) return []

    const raw = entries.map((e) => {
      const net = e.calories - burnForDate(e.date)
      return {
        key: e.date,
        label: new Date(`${e.date}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        fullLabel: new Date(`${e.date}T00:00:00`).toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
        value: net,
        delta: Math.round(net - target),
      }
    })

    const values = raw.map((p) => p.value)
    const min = Math.min(...values, target)
    const max = Math.max(...values, target)
    const range = max - min || 1
    const chartHeight = height - topPad - bottomLabelHeight
    // margen para que los puntos extremos no toquen los bordes
    const pad = range * 0.15

    function toY(value) {
      return topPad + chartHeight - ((value - min + pad) / (range + pad * 2)) * chartHeight
    }

    return raw.map((p, i) => ({
      ...p,
      x: sidePad + (i / (raw.length - 1)) * (width - sidePad * 2),
      y: toY(p.value),
      goalY: toY(target),
    }))
  }, [entries, burnForDate, target])

  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white">
        Añade al menos dos registros para ver la gráfica.
      </p>
    )
  }

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const goalY = points[0].goalY
  const labelEvery = Math.max(1, Math.ceil(points.length / 8))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <line
        x1={sidePad}
        y1={goalY}
        x2={width - sidePad}
        y2={goalY}
        stroke="#facc15"
        strokeWidth="1"
        strokeDasharray="4 3"
      >
        <title>Objetivo: {target.toLocaleString('es-ES')} kcal</title>
      </line>
      <text x={width - sidePad} y={goalY - 5} textAnchor="end" fontSize="9" fill="#facc15">
        {target.toLocaleString('es-ES')}
      </text>

      <path d={path} fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => {
        const over = p.delta > 0
        const color = over ? '#f87171' : '#34d399'
        return (
          <g key={p.key}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color}>
              <title>
                {p.fullLabel}: {p.value.toLocaleString('es-ES')} kcal netas ({over ? '+' : ''}
                {p.delta.toLocaleString('es-ES')} vs objetivo)
              </title>
            </circle>
            <text
              x={p.x}
              y={over ? p.y - 8 : p.y + 13}
              textAnchor="middle"
              fontSize="8"
              fontWeight="600"
              fill={color}
            >
              {over ? '+' : ''}
              {p.delta}
            </text>
            {i % labelEvery === 0 && (
              <text x={p.x} y={height - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">
                {p.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function Dieta() {
  const [entries, setEntries] = useState(null)
  const [activity, setActivity] = useState(null) // { stepsByDate, kmByDate, gymByDate, weightKg }
  const [expanded, setExpanded] = useState(false)
  const [date, setDate] = useState(todayKey)
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

  function burnForDate(date) {
    if (!activity) return 0
    return estimateBurn({
      steps: activity.stepsByDate[date] ?? 0,
      km: activity.kmByDate[date] ?? 0,
      gymSessions: activity.gymByDate[date] ?? 0,
      weightKg: activity.weightKg,
    })
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

  const latestBurn = sorted[0] ? burnForDate(sorted[0].date) : null
  const latestNet = sorted[0] ? sorted[0].calories - latestBurn - TARGET_CALORIES : null

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-500">🍎 Dieta</h1>

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
        <label className="flex flex-col gap-1 text-sm text-white">
          Kcal
          <input
            type="number"
            required
            min="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="2200"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-white">
          Proteína (g)
          <input
            type="number"
            min="0"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="150"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-white">
          Carbs (g)
          <input
            type="number"
            min="0"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="220"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-white">
          Grasa (g)
          <input
            type="number"
            min="0"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="70"
            className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
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
        <p className="text-sm text-white">Cargando...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-white">Todavía no has registrado ningún día.</p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
              <p className="text-2xl font-semibold">
                {sorted[0].calories.toLocaleString('es-ES')} kcal
              </p>
              <p className="text-sm text-white">
                Consumidas ({new Date(sorted[0].date + 'T00:00:00').toLocaleDateString('es-ES')})
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
              <p className="text-2xl font-semibold">{avg7?.toLocaleString('es-ES') ?? '—'} kcal</p>
              <p className="text-sm text-white">Media últimos {last7.length} días</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
              <p className="text-2xl font-semibold text-violet-500">
                {latestBurn?.toLocaleString('es-ES') ?? '—'} kcal
              </p>
              <p className="text-sm text-white">Quemadas en actividad (pasos + carrera + gimnasio)</p>
            </div>
            <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-600/20 via-slate-900/50 to-slate-900/50 p-4 shadow-lg shadow-violet-600/10">
              <p
                className={`text-2xl font-semibold ${
                  latestNet == null ? '' : latestNet > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {latestNet == null ? '—' : `${latestNet > 0 ? '+' : ''}${latestNet.toLocaleString('es-ES')}`} kcal
              </p>
              <p className="text-sm text-white">Neto (consumidas − actividad − objetivo {TARGET_CALORIES})</p>
            </div>
          </div>

          <p className="mb-6 text-xs text-white">
            Las kcal quemadas son una estimación (pasos, distancia de carrera y ~{GYM_SESSION_KCAL} kcal por
            sesión de gimnasio) y no incluyen el metabolismo basal. El objetivo diario está fijado en{' '}
            {TARGET_CALORIES.toLocaleString('es-ES')} kcal.
          </p>

          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium text-white">
              Consumidas − actividad, frente al objetivo
            </p>
            <NetChart entries={entries} burnForDate={burnForDate} target={TARGET_CALORIES} />
          </div>

          <ul className="flex flex-col gap-2">
            {visible.map((entry) => (
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
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{entry.calories} kcal</span>
                  <span className="text-white">−{burnForDate(entry.date)}</span>
                  {(entry.protein_g || entry.carbs_g || entry.fat_g) && (
                    <span className="hidden text-white sm:inline">
                      P {entry.protein_g ?? '—'} · C {entry.carbs_g ?? '—'} · G {entry.fat_g ?? '—'}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-white hover:text-red-400"
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
              className="mt-4 w-full rounded-lg border border-slate-800 py-2.5 text-sm text-white hover:border-slate-600 hover:text-slate-200"
            >
              Ver todos ({sorted.length})
            </button>
          )}
        </>
      )}
    </div>
  )
}
