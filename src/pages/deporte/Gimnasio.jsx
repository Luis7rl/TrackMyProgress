import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MonthCalendar from '../../components/MonthCalendar'
import MuscleMap from '../../components/MuscleMap'
import { supabase } from '../../lib/supabaseClient'
import { classifyExercise, MUSCLE_GROUPS } from '../../lib/muscleGroups'

const VISIBLE_LIMIT = 10

export default function Gimnasio() {
  const [workouts, setWorkouts] = useState(null)
  const [exerciseNames, setExerciseNames] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      const [{ data: w, error: wErr }, { data: s, error: sErr }] = await Promise.all([
        supabase
          .from('workouts')
          .select('id, date, notes, workout_sets(count)')
          .order('date', { ascending: false }),
        supabase.from('workout_sets').select('exercise_name'),
      ])

      if (!active) return
      if (wErr || sErr) {
        setError((wErr || sErr).message)
        return
      }
      setWorkouts(w)
      setExerciseNames(s.map((row) => row.exercise_name))
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const markedDates = useMemo(() => new Set(workouts?.map((w) => w.date) ?? []), [workouts])

  const volumes = useMemo(() => {
    const counts = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0]))
    exerciseNames?.forEach((name) => {
      const group = classifyExercise(name)
      if (group) counts[group] += 1
    })
    return counts
  }, [exerciseNames])

  const visible = expanded ? workouts : workouts?.slice(0, VISIBLE_LIMIT)
  const remaining = workouts ? workouts.length - VISIBLE_LIMIT : 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gimnasio</h1>
        <div className="flex items-center gap-4">
          <Link to="/deporte/gimnasio/importar" className="text-sm text-violet-500 hover:underline">
            Importar desde Hevy
          </Link>
          <Link
            to="/deporte/gimnasio/nuevo"
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium hover:bg-violet-500"
          >
            + Nuevo
          </Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-2xl font-semibold">{workouts?.length ?? '—'}</p>
        <p className="text-sm text-slate-500">Entrenamientos totales</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <MonthCalendar markedDates={markedDates} />
        {exerciseNames && <MuscleMap volumes={volumes} />}
      </div>

      <h2 className="mb-3 text-sm font-medium text-slate-400">Historial</h2>

      {workouts === null && !error && <p className="text-sm text-slate-500">Cargando...</p>}

      {workouts?.length === 0 && (
        <p className="text-sm text-slate-500">Todavía no has registrado ningún entrenamiento.</p>
      )}

      <ul className="flex flex-col gap-3">
        {visible?.map((w) => (
          <li key={w.id}>
            <Link
              to={`/deporte/gimnasio/${w.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 hover:border-slate-700"
            >
              <div>
                <p className="font-medium">
                  {new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
                {w.notes && <p className="text-sm text-slate-500">{w.notes}</p>}
              </div>
              <span className="text-sm text-slate-500">
                {w.workout_sets?.[0]?.count ?? 0} series
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-4 w-full rounded-lg border border-slate-800 py-2.5 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-200"
        >
          Ver todos ({workouts.length})
        </button>
      )}
    </div>
  )
}
