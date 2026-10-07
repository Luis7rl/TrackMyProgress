import { useEffect, useState } from 'react'
import { useConfirm } from '../context/ConfirmContext'
import {
  CANCEL_WINDOW_MS,
  cancelRedemption,
  fetchPointsSummary,
  fetchRedemptions,
  POINTS,
  redeemReward,
  REWARDS,
  TARGET_CALORIES,
} from '../lib/rewards'

const EARN_TILES = [
  { key: 'workouts', icon: '🏋️', rate: `${POINTS.perWorkout} pts por entreno` },
  { key: 'running', icon: '🏃', rate: `${POINTS.perKmRun} pts por km` },
  { key: 'steps', icon: '👟', rate: `${POINTS.per1000Steps} pts por 1.000 pasos` },
  { key: 'study', icon: '📚', rate: `${POINTS.perStudyHour} pts por hora` },
  { key: 'diet', icon: '🍎', rate: `${POINTS.perDietDayUnderTarget} pts por día bajo ${TARGET_CALORIES} kcal` },
]

export default function Recompensas() {
  const confirm = useConfirm()
  const [summary, setSummary] = useState(null)
  const [redemptions, setRedemptions] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    try {
      const [s, red] = await Promise.all([fetchPointsSummary(), fetchRedemptions()])
      setSummary(s)
      setRedemptions(red)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleRedeem(reward) {
    if (!(await confirm(`¿Canjear "${reward.name}" por ${reward.cost} puntos?`))) return
    setBusyId(reward.id)
    try {
      await redeemReward(reward.name, reward.cost)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(redemption) {
    const msg = `¿Cancelar el canje de "${redemption.reward_name}"? Recuperas ${redemption.points_spent} puntos.`
    if (!(await confirm(msg))) return
    try {
      await cancelRedemption(redemption.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const balance = summary?.balance ?? 0

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-500">
        🏆 Recompensas
      </h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-6 flex w-full flex-col items-center rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-600/20 via-slate-900/50 to-slate-900/50 px-10 py-8 shadow-lg shadow-violet-600/10">
        <p className="text-sm font-bold uppercase tracking-wider text-violet-300">Puntos disponibles</p>
        <p className="mt-2 text-6xl font-extrabold text-violet-400">{summary ? summary.balance : '—'}</p>
        {summary && (
          <p className="mt-2 text-xs text-white">
            {summary.earned.toLocaleString('es-ES')} ganados − {summary.spent.toLocaleString('es-ES')} canjeados
          </p>
        )}
      </div>

      <h2 className="mb-3 text-sm font-medium text-white">Canjear</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {REWARDS.map((r) => {
          const affordable = balance >= r.cost
          const percent = Math.min(100, Math.round((balance / r.cost) * 100))
          return (
            <div
              key={r.id}
              className={`flex flex-col rounded-xl border p-3 shadow-sm ${
                affordable
                  ? 'border-violet-500/50 bg-gradient-to-b from-violet-600/20 via-slate-900/50 to-slate-900/50'
                  : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              <p className="text-2xl" aria-hidden="true">
                {r.icon}
              </p>
              <p className="mt-1 text-sm font-medium">{r.name}</p>
              <p className="text-xs text-white">{r.cost} puntos</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${percent}%` }} />
              </div>
              <button
                onClick={() => handleRedeem(r)}
                disabled={!affordable || busyId === r.id}
                className="mt-3 rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
              >
                {affordable ? 'Canjear' : `Te faltan ${r.cost - balance}`}
              </button>
            </div>
          )
        })}
      </div>

      <h2 className="mb-3 text-sm font-medium text-white">Cómo se ganan puntos</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {EARN_TILES.map((t) => (
          <div key={t.key} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 shadow-sm">
            <p className="text-2xl" aria-hidden="true">
              {t.icon}
            </p>
            <p className="mt-1 text-xs text-white">{t.rate}</p>
            <p className="mt-2 text-xl font-semibold text-violet-300">
              {summary ? summary.breakdown[t.key].points.toLocaleString('es-ES') : '—'}
            </p>
            <p className="text-xs text-white">puntos generados</p>
          </div>
        ))}
      </div>

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
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white">
                    −{r.points_spent} ·{' '}
                    {new Date(r.redeemed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                  {Date.now() - new Date(r.redeemed_at).getTime() < CANCEL_WINDOW_MS && (
                    <button
                      onClick={() => handleCancel(r)}
                      className="rounded-lg border border-red-500/50 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/10"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
