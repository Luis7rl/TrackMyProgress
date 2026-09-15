import { useEffect, useState } from 'react'
import { estimateBurn } from '../lib/calorieEstimate'
import { mondayOf, toDateKey } from '../lib/dates'
import { fetchProfile } from '../lib/profile'
import { supabase } from '../lib/supabaseClient'

function computeWeekStreak(dates) {
  const weeks = new Set(dates.map((d) => toDateKey(mondayOf(`${d}T00:00:00`))))
  let streak = 0
  let cursor = mondayOf(new Date())
  let isCurrentWeek = true

  for (;;) {
    const key = toDateKey(cursor)
    if (weeks.has(key)) {
      streak++
    } else if (!isCurrentWeek) {
      break
    }
    isCurrentWeek = false
    cursor.setDate(cursor.getDate() - 7)
  }

  return streak
}

// La llama refleja lo larga que es la racha: apagada sin racha, y a partir
// de ciertos umbrales crece y cambia a morado para que se note el esfuerzo.
function flameStyle(streak) {
  if (!streak) return { size: 'text-6xl', filter: 'grayscale(1) opacity(0.5)' }
  if (streak <= 10) return { size: 'text-6xl', filter: 'none' }
  if (streak <= 50) return { size: 'text-7xl', filter: 'none' }
  if (streak <= 100) return { size: 'text-7xl', filter: 'hue-rotate(220deg) saturate(1.6)' }
  return { size: 'text-8xl', filter: 'hue-rotate(220deg) saturate(1.6)' }
}

function StatCard({ value, label, hero }) {
  return (
    <div
      className={
        hero
          ? 'rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-600/20 via-slate-900/50 to-slate-900/50 p-4 shadow-lg shadow-violet-600/10'
          : 'rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm'
      }
    >
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-sm text-white">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const [username, setUsername] = useState(null)
  const [streak, setStreak] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [totals, setTotals] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const mondayKey = toDateKey(mondayOf(new Date()))

        const [
          profile,
          { data: allWorkouts, error: allWErr },
          { data: weekWorkouts, error: wErr },
          { data: allRunning, error: allRErr },
          { data: weekRunning, error: rErr },
          { data: allSteps, error: allSErr },
          { data: weekSteps, error: sErr },
          { data: allStudy, error: allStErr },
          { data: weekStudy, error: stErr },
          { data: weight, error: wgErr },
        ] = await Promise.all([
          fetchProfile(),
          supabase.from('workouts').select('date'),
          supabase.from('workouts').select('date').gte('date', mondayKey),
          supabase.from('running_sessions').select('distance_km'),
          supabase.from('running_sessions').select('distance_km').gte('date', mondayKey),
          supabase.from('step_logs').select('steps'),
          supabase.from('step_logs').select('steps').gte('date', mondayKey),
          supabase.from('study_sessions').select('duration_minutes'),
          supabase.from('study_sessions').select('duration_minutes').gte('date', mondayKey),
          supabase.from('body_weight_logs').select('weight_kg').order('date', { ascending: false }).limit(1),
        ])

        const err = allWErr || wErr || allRErr || rErr || allSErr || sErr || allStErr || stErr || wgErr
        if (!active) return
        if (err) throw err

        setUsername(profile?.username ?? null)
        setStreak(computeWeekStreak(allWorkouts.map((w) => w.date)))

        const weightKg = weight[0]?.weight_kg

        const weekKm = weekRunning.reduce((sum, r) => sum + Number(r.distance_km), 0)
        const weekStepsTotal = weekSteps.reduce((sum, s) => sum + s.steps, 0)
        const weekStudyMinutes = weekStudy.reduce((sum, s) => sum + s.duration_minutes, 0)
        const weekBurn = estimateBurn({
          steps: weekStepsTotal,
          km: weekKm,
          gymSessions: weekWorkouts.length,
          weightKg,
        })

        setWeekly({
          gymCount: weekWorkouts.length,
          totalKm: weekKm,
          totalSteps: weekStepsTotal,
          studyHours: Math.round((weekStudyMinutes / 60) * 10) / 10,
          burn: weekBurn,
        })

        const allKm = allRunning.reduce((sum, r) => sum + Number(r.distance_km), 0)
        const allStepsTotal = allSteps.reduce((sum, s) => sum + s.steps, 0)
        const allStudyMinutes = allStudy.reduce((sum, s) => sum + s.duration_minutes, 0)
        const allBurn = estimateBurn({
          steps: allStepsTotal,
          km: allKm,
          gymSessions: allWorkouts.length,
          weightKg,
        })

        setTotals({
          gymCount: allWorkouts.length,
          totalKm: allKm,
          totalSteps: allStepsTotal,
          studyHours: Math.round((allStudyMinutes / 60) * 10) / 10,
          burn: allBurn,
        })
      } catch (err) {
        if (active) setError(err.message)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const flame = flameStyle(streak)

  return (
    <div className="flex flex-col items-center pt-6 text-center">
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="flex w-full flex-col items-center rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-600/20 via-slate-900/50 to-slate-900/50 px-10 py-10 shadow-lg shadow-violet-600/10">
        {username && <p className="mb-4 text-base font-medium text-white">Hola, {username}</p>}
        <span className={`${flame.size} drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]`} style={{ filter: flame.filter }}>
          🔥
        </span>
        <p className="mt-3 text-sm font-bold uppercase tracking-wider text-violet-300">Llevas</p>
        <p className="text-6xl font-extrabold text-violet-400">{streak === null ? '—' : streak}</p>
        <p className="mt-1 text-sm font-bold uppercase tracking-wider text-violet-300">
          {streak === 1 ? 'Semana seguida entrenando' : 'Semanas seguidas entrenando'}
        </p>
      </div>

      {weekly && (
        <div className="mt-10 w-full text-left">
          <p className="mb-3 text-base font-bold uppercase tracking-wider text-slate-200">Esta semana</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard value={weekly.gymCount} label="Entrenamientos" />
            <StatCard value={`${weekly.totalKm.toFixed(1)} km`} label="Corridos" />
            <StatCard value={weekly.totalSteps.toLocaleString('es-ES')} label="Pasos" />
            <StatCard value={`${weekly.studyHours}h`} label="Estudio" />
            <StatCard value={`${weekly.burn.toLocaleString('es-ES')} kcal`} label="Quemadas en actividad" />
          </div>
        </div>
      )}

      {totals && (
        <div className="mt-8 w-full text-left">
          <p className="mb-3 text-base font-bold uppercase tracking-wider text-slate-200">Total histórico</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard value={totals.gymCount} label="Entrenamientos" />
            <StatCard value={`${totals.totalKm.toFixed(1)} km`} label="Corridos" />
            <StatCard value={totals.totalSteps.toLocaleString('es-ES')} label="Pasos" />
            <StatCard value={`${totals.studyHours}h`} label="Estudio" />
            <StatCard value={`${totals.burn.toLocaleString('es-ES')} kcal`} label="Quemadas en actividad" />
          </div>
        </div>
      )}
    </div>
  )
}
