import { useEffect, useState } from 'react'
import { estimateBurn } from '../lib/calorieEstimate'
import { mondayOf, toDateKey } from '../lib/dates'
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

export default function Dashboard() {
  const [streak, setStreak] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const mondayKey = toDateKey(mondayOf(new Date()))

        const [
          { data: allWorkouts, error: allWErr },
          { data: weekWorkouts, error: wErr },
          { data: running, error: rErr },
          { data: steps, error: sErr },
          { data: diet, error: dErr },
          { data: study, error: stErr },
          { data: weight, error: wgErr },
        ] = await Promise.all([
          supabase.from('workouts').select('date'),
          supabase.from('workouts').select('date').gte('date', mondayKey),
          supabase.from('running_sessions').select('distance_km').gte('date', mondayKey),
          supabase.from('step_logs').select('steps').gte('date', mondayKey),
          supabase.from('diet_logs').select('calories').gte('date', mondayKey),
          supabase.from('study_sessions').select('duration_minutes').gte('date', mondayKey),
          supabase.from('body_weight_logs').select('weight_kg').order('date', { ascending: false }).limit(1),
        ])

        const err = allWErr || wErr || rErr || sErr || dErr || stErr || wgErr
        if (!active) return
        if (err) throw err

        setStreak(computeWeekStreak(allWorkouts.map((w) => w.date)))

        const totalKm = running.reduce((sum, r) => sum + Number(r.distance_km), 0)
        const totalSteps = steps.reduce((sum, s) => sum + s.steps, 0)
        const totalStudyMinutes = study.reduce((sum, s) => sum + s.duration_minutes, 0)
        const consumed = diet.reduce((sum, d) => sum + d.calories, 0)
        const burn = estimateBurn({
          steps: totalSteps,
          km: totalKm,
          gymSessions: weekWorkouts.length,
          weightKg: weight[0]?.weight_kg,
        })

        setWeekly({
          gymCount: weekWorkouts.length,
          totalKm,
          totalSteps,
          studyHours: Math.round((totalStudyMinutes / 60) * 10) / 10,
          consumed,
          burn,
          hasDiet: diet.length > 0,
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

  return (
    <div className="flex flex-col items-center pt-6 text-center">
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="flex w-full flex-col items-center rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-600/20 via-slate-900/50 to-slate-900/50 px-10 py-10 shadow-lg shadow-violet-600/10">
        <span className="text-6xl drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]">🔥</span>
        <p className="mt-3 text-6xl font-extrabold text-violet-400">
          {streak === null ? '—' : streak}
        </p>
        <p className="mt-2 text-sm font-bold uppercase tracking-wider text-violet-300">
          {streak === 1 ? 'Semana seguida entrenando' : 'Semanas seguidas entrenando'}
        </p>
      </div>

      {weekly && (
        <div className="mt-10 w-full text-left">
          <p className="mb-3 text-base font-bold uppercase tracking-wider text-slate-200">Esta semana</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
              <p className="text-xl font-semibold">{weekly.gymCount}</p>
              <p className="text-sm text-white">Entrenamientos</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
              <p className="text-xl font-semibold">{weekly.totalKm.toFixed(1)} km</p>
              <p className="text-sm text-white">Corridos</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
              <p className="text-xl font-semibold">{weekly.totalSteps.toLocaleString('es-ES')}</p>
              <p className="text-sm text-white">Pasos</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
              <p className="text-xl font-semibold">{weekly.studyHours}h</p>
              <p className="text-sm text-white">Estudio</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:col-span-2 shadow-sm">
              {weekly.hasDiet ? (
                <>
                  <p className="text-xl font-semibold">
                    {weekly.consumed.toLocaleString('es-ES')} <span className="text-white">/</span>{' '}
                    {weekly.burn.toLocaleString('es-ES')} kcal
                  </p>
                  <p className="text-sm text-white">Consumidas / quemadas en actividad</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-semibold">{weekly.burn.toLocaleString('es-ES')} kcal</p>
                  <p className="text-sm text-white">Quemadas en actividad</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
