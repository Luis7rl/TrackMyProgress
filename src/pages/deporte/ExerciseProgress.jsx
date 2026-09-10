import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

function ProgressChart({ points }) {
  const width = 600
  const height = 180
  const padding = 24

  const scaled = useMemo(() => {
    if (points.length < 2) return []
    const values = points.map((p) => p.oneRM)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    return points.map((p, i) => {
      const x = padding + (i / (points.length - 1)) * (width - padding * 2)
      const y = height - padding - ((p.oneRM - min) / range) * (height - padding * 2)
      return { x, y, ...p }
    })
  }, [points])

  if (scaled.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Añade al menos dos sesiones con este ejercicio para ver la gráfica.
      </p>
    )
  }

  const path = scaled.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <path d={path} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {scaled.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#8b5cf6" />
      ))}
    </svg>
  )
}

export default function ExerciseProgress() {
  const { name } = useParams()
  const exerciseName = decodeURIComponent(name)
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('weight_kg, reps, workouts(date)')
        .eq('exercise_name', exerciseName)

      if (!active) return
      if (error) {
        setError(error.message)
        return
      }

      // Mejor serie (1RM estimado) por sesión, ordenadas por fecha.
      const byDate = {}
      data.forEach((s) => {
        if (s.weight_kg == null || !s.reps || !s.workouts?.date) return
        const oneRM = s.weight_kg * (1 + s.reps / 30)
        const date = s.workouts.date
        if (!byDate[date] || oneRM > byDate[date].oneRM) {
          byDate[date] = { date, weight: s.weight_kg, reps: s.reps, oneRM }
        }
      })
      setSessions(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)))
    }

    load()
    return () => {
      active = false
    }
  }, [exerciseName])

  const best = sessions?.length ? sessions.reduce((a, b) => (b.oneRM > a.oneRM ? b : a)) : null
  const chronological = sessions ? [...sessions].reverse() : []

  return (
    <div>
      <Link to="/deporte/gimnasio" className="mb-4 inline-block text-sm text-violet-600 hover:underline">
        ← Gimnasio
      </Link>

      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">{exerciseName}</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {sessions === null ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-slate-500">No hay series registradas de este ejercicio.</p>
      ) : (
        <>
          {best && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-2xl font-semibold">
                {best.weight} kg × {best.reps}
              </p>
              <p className="text-sm text-slate-500">
                Récord ({new Date(best.date + 'T00:00:00').toLocaleDateString('es-ES')})
              </p>
            </div>
          )}

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium text-slate-600">Evolución (1RM estimado)</p>
            <ProgressChart points={sessions} />
          </div>

          <ul className="flex flex-col gap-2">
            {chronological.map((s) => (
              <li
                key={s.date}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <span className="text-sm">
                  {new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span className="text-sm font-medium">
                  {s.weight} kg × {s.reps}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
