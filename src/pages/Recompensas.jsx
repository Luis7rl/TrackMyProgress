import { useEffect, useState } from 'react'
import { useConfirm } from '../context/ConfirmContext'
import {
  createReward,
  deleteReward,
  fetchPointsSummary,
  fetchRedemptions,
  fetchRewards,
  POINTS,
  redeemReward,
} from '../lib/rewards'

const TARGET_CALORIES = 2200

const BREAKDOWN_LABELS = [
  { key: 'workouts', icon: '🏋️', label: (b) => `${b.workouts.count} entrenamientos` },
  { key: 'running', icon: '🏃', label: (b) => `${b.running.km.toFixed(1)} km corridos` },
  { key: 'steps', icon: '👟', label: (b) => `${b.steps.total.toLocaleString('es-ES')} pasos` },
  { key: 'study', icon: '📚', label: (b) => `${b.study.hours.toFixed(1)}h de estudio` },
  { key: 'diet', icon: '🍎', label: (b) => `${b.diet.days} días por debajo del objetivo` },
]

function NewRewardForm({ onCreated }) {
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !cost) return
    setSaving(true)
    try {
      await createReward(name.trim(), Number(cost))
      setName('')
      setCost('')
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3">
      <label className="flex flex-1 flex-col gap-1 text-sm text-white">
        Nueva recompensa
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Ver una peli"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-white">
        Puntos
        <input
          type="number"
          min="1"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="100"
          className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
      >
        Añadir
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  )
}

export default function Recompensas() {
  const confirm = useConfirm()
  const [summary, setSummary] = useState(null)
  const [rewards, setRewards] = useState(null)
  const [redemptions, setRedemptions] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    try {
      const [s, r, red] = await Promise.all([
        fetchPointsSummary(TARGET_CALORIES),
        fetchRewards(),
        fetchRedemptions(),
      ])
      setSummary(s)
      setRewards(r)
      setRedemptions(red)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleRedeem(reward) {
    if (!(await confirm(`¿Canjear "${reward.name}" por ${reward.point_cost} puntos?`))) return
    setBusyId(reward.id)
    try {
      await redeemReward(reward.name, reward.point_cost)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDeleteReward(id) {
    if (!(await confirm('¿Eliminar esta recompensa?'))) return
    try {
      await deleteReward(id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-500">
        🏆 Recompensas
      </h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-6 flex w-full flex-col items-center rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-600/20 via-slate-900/50 to-slate-900/50 px-10 py-8 shadow-lg shadow-violet-600/10">
        <p className="text-sm font-bold uppercase tracking-wider text-violet-300">Puntos disponibles</p>
        <p className="mt-2 text-6xl font-extrabold text-violet-400">{summary?.balance ?? '—'}</p>
        {summary && (
          <p className="mt-2 text-xs text-white">
            {summary.earned.toLocaleString('es-ES')} ganados − {summary.spent.toLocaleString('es-ES')} canjeados
          </p>
        )}
      </div>

      {summary && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-white">De dónde vienen tus puntos</h2>
          <div className="flex flex-col gap-2">
            {BREAKDOWN_LABELS.map((b) => (
              <div
                key={b.key}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 shadow-sm"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span aria-hidden="true">{b.icon}</span>
                  {b.label(summary.breakdown)}
                </span>
                <span className="text-sm font-medium text-violet-300">
                  +{summary.breakdown[b.key].points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-sm font-medium text-white">Recompensas</h2>
      <NewRewardForm onCreated={load} />

      {rewards === null ? (
        <p className="text-sm text-white">Cargando...</p>
      ) : rewards.length === 0 ? (
        <p className="mb-6 text-sm text-white">Todavía no has creado ninguna recompensa.</p>
      ) : (
        <ul className="mb-6 flex flex-col gap-2">
          {rewards.map((r) => {
            const affordable = summary && summary.balance >= r.point_cost
            return (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-sm text-white">{r.point_cost} puntos</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleRedeem(r)}
                    disabled={!affordable || busyId === r.id}
                    className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
                  >
                    Canjear
                  </button>
                  <button
                    onClick={() => handleDeleteReward(r.id)}
                    className="text-white hover:text-red-400"
                    aria-label="Eliminar recompensa"
                  >
                    ✕
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {redemptions && redemptions.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-medium text-white">Historial de canjes</h2>
          <ul className="flex flex-col gap-2">
            {redemptions.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 shadow-sm"
              >
                <span className="text-sm">{r.reward_name}</span>
                <span className="text-sm text-white">
                  −{r.points_spent} ·{' '}
                  {new Date(r.redeemed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-8 text-xs text-white">
        Puntos: {POINTS.perWorkout}/entrenamiento · {POINTS.perKmRun}/km corrido ·{' '}
        {POINTS.per1000Steps}/1000 pasos · {POINTS.perStudyHour}/hora de estudio ·{' '}
        {POINTS.perDietDayUnderTarget}/día por debajo de {TARGET_CALORIES} kcal.
      </p>
    </div>
  )
}
