import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MonthCalendar from '../../components/MonthCalendar'
import MuscleMap from '../../components/MuscleMap'
import { supabase } from '../../lib/supabaseClient'
import { classifyExercise, MUSCLE_GROUPS } from '../../lib/muscleGroups'

const VISIBLE_LIMIT = 10
const PAGE_SIZE = 1000

// Supabase limita cada select a 1000 filas por defecto: paginamos para no
// subcontar el volumen por grupo muscular ni los récords en historiales
// largos (ej. Hevy).
async function fetchAllWorkoutSets() {
  let from = 0
  let all = []
  for (;;) {
    const { data, error } = await supabase
      .from('workout_sets')
      .select('exercise_name, weight_kg, reps, workouts(date)')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    all = all.concat(data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

export default function Gimnasio() {
  const [workouts, setWorkouts] = useState(null)
  const [sets, setSets] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [prsExpanded, setPrsExpanded] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [{ data: w, error: wErr }, allSets] = await Promise.all([
          supabase
            .from('workouts')
            .select('id, date, notes, workout_sets(count)')
            .order('date', { ascending: false }),
          fetchAllWorkoutSets(),
        ])

        if (!active) return
        if (wErr) throw wErr
        setWorkouts(w)
        setSets(allSets)
      } catch (err) {
        if (active) setError(err.message)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const markedDates = useMemo(() => new Set(workouts?.map((w) => w.date) ?? []), [workouts])

  const volumes = useMemo(() => {
    const counts = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0]))
    sets?.forEach((s) => {
      const group = classifyExercise(s.exercise_name)
      if (group) counts[group] += 1
    })
    return counts
  }, [sets])

  // Récord por ejercicio: el set con mejor 1RM estimado (fórmula de Epley),
  // para poder comparar de forma justa series con distinto número de reps.
  const prs = useMemo(() => {
    if (!sets) return []
    const best = {}
    sets.forEach((s) => {
      if (s.weight_kg == null || !s.reps) return
      const oneRM = s.weight_kg * (1 + s.reps / 30)
      const current = best[s.exercise_name]
      if (!current || oneRM > current.oneRM) {
        best[s.exercise_name] = {
          exercise: s.exercise_name,
          weight: s.weight_kg,
          reps: s.reps,
          date: s.workouts?.date,
          oneRM,
        }
      }
    })
    return Object.values(best).sort((a, b) => b.oneRM - a.oneRM)
  }, [sets])

  const visible = expanded ? workouts : workouts?.slice(0, VISIBLE_LIMIT)
  const remaining = workouts ? workouts.length - VISIBLE_LIMIT : 0
  const visiblePrs = prsExpanded ? prs : prs.slice(0, VISIBLE_LIMIT)
  const remainingPrs = prs.length - VISIBLE_LIMIT

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gimnasio</h1>
        <div className="flex items-center gap-4">
          <Link to="/deporte/gimnasio/importar" className="text-sm text-violet-600 hover:underline">
            Importar desde Hevy
          </Link>
          <Link
            to="/deporte/gimnasio/nuevo"
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            + Nuevo
          </Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-2xl font-semibold">{workouts?.length ?? '—'}</p>
        <p className="text-sm text-slate-500">Entrenamientos totales</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <MonthCalendar markedDates={markedDates} />
        {sets && <MuscleMap volumes={volumes} />}
      </div>

      {prs.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-medium text-slate-600">Récords personales</h2>
          <ul className="mb-6 flex flex-col gap-2">
            {visiblePrs.map((pr) => (
              <li key={pr.exercise}>
                <Link
                  to={`/deporte/gimnasio/ejercicio/${encodeURIComponent(pr.exercise)}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-300"
                >
                  <span className="text-sm">{pr.exercise}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">
                      {pr.weight} kg × {pr.reps}
                    </span>
                    {pr.date && (
                      <span className="text-slate-500">
                        {new Date(pr.date + 'T00:00:00').toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {!prsExpanded && remainingPrs > 0 && (
            <button
              onClick={() => setPrsExpanded(true)}
              className="mb-6 w-full rounded-lg border border-slate-200 py-2.5 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
            >
              Ver todos ({prs.length})
            </button>
          )}
        </>
      )}

      <h2 className="mb-3 text-sm font-medium text-slate-600">Historial</h2>

      {workouts === null && !error && <p className="text-sm text-slate-500">Cargando...</p>}

      {workouts?.length === 0 && (
        <p className="text-sm text-slate-500">Todavía no has registrado ningún entrenamiento.</p>
      )}

      <ul className="flex flex-col gap-3">
        {visible?.map((w) => (
          <li key={w.id}>
            <Link
              to={`/deporte/gimnasio/${w.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-300"
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
          className="mt-4 w-full rounded-lg border border-slate-200 py-2.5 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
        >
          Ver todos ({workouts.length})
        </button>
      )}
    </div>
  )
}
