import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MonthCalendar from '../../components/MonthCalendar'
import MuscleMap from '../../components/MuscleMap'
import { supabase } from '../../lib/supabaseClient'
import { classifyExercise, GROUP_SHORT_LABELS, MUSCLE_GROUPS } from '../../lib/muscleGroups'

const VISIBLE_LIMIT = 10
const PR_VISIBLE_LIMIT = 3
const MEDALS = ['🥇', '🥈', '🥉']
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

  // Grupos musculares trabajados cada día, para mostrar chips en el historial.
  const groupsByDate = useMemo(() => {
    const map = {}
    sets?.forEach((s) => {
      const date = s.workouts?.date
      if (!date) return
      const group = classifyExercise(s.exercise_name)
      if (!group) return
      if (!map[date]) map[date] = new Set()
      map[date].add(group)
    })
    return map
  }, [sets])

  // Récord por ejercicio: la serie con más volumen (peso × reps), no la más
  // pesada en bruto, para que series pesadas de pocas reps no gasten a
  // series realmente más exigentes.
  const prs = useMemo(() => {
    if (!sets) return []
    const best = {}
    sets.forEach((s) => {
      if (s.weight_kg == null || !s.reps) return
      const volume = s.weight_kg * s.reps
      const current = best[s.exercise_name]
      if (!current || volume > current.volume) {
        best[s.exercise_name] = {
          exercise: s.exercise_name,
          weight: s.weight_kg,
          reps: s.reps,
          date: s.workouts?.date,
          volume,
        }
      }
    })
    return Object.values(best).sort((a, b) => b.volume - a.volume)
  }, [sets])

  const visible = expanded ? workouts : workouts?.slice(0, VISIBLE_LIMIT)
  const remaining = workouts ? workouts.length - VISIBLE_LIMIT : 0
  const visiblePrs = prsExpanded ? prs : prs.slice(0, PR_VISIBLE_LIMIT)
  const remainingPrs = prs.length - PR_VISIBLE_LIMIT

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-500">
          🏋️ Gimnasio
        </h1>
        <Link
          to="/deporte/gimnasio/importar"
          className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Importar desde Hevy
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-6 rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-600/20 via-slate-900/50 to-slate-900/50 p-4 shadow-lg shadow-violet-600/10">
        <p className="text-2xl font-semibold">{workouts?.length ?? '—'}</p>
        <p className="text-sm text-white">Entrenamientos totales</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <MonthCalendar markedDates={markedDates} />
        {sets && <MuscleMap volumes={volumes} />}
      </div>

      <h2 className="mb-3 text-sm font-medium text-white">Historial</h2>

      {workouts === null && !error && <p className="text-sm text-white">Cargando...</p>}

      {workouts?.length === 0 && (
        <p className="text-sm text-white">Todavía no has registrado ningún entrenamiento.</p>
      )}

      <ul className="mb-6 flex flex-col gap-3">
        {visible?.map((w) => {
          const date = new Date(w.date + 'T00:00:00')
          const groups = [...(groupsByDate[w.date] ?? [])]
          return (
            <li key={w.id}>
              <Link
                to={`/deporte/gimnasio/${w.id}`}
                className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 hover:border-violet-500/50 shadow-sm"
              >
                <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-violet-500/30 bg-violet-600/10 py-1.5">
                  <span className="text-lg font-bold leading-none text-violet-300">{date.getDate()}</span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wide text-white">
                    {date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium capitalize">
                    {date.toLocaleDateString('es-ES', { weekday: 'long' })}
                  </p>
                  {groups.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {groups.map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] text-violet-300"
                        >
                          {GROUP_SHORT_LABELS[g]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <span className="shrink-0 text-sm font-medium text-white">
                  {w.workout_sets?.[0]?.count ?? 0} series
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {remaining > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mb-8 w-full rounded-lg border border-slate-800 py-2.5 text-sm text-white hover:border-slate-600 hover:text-slate-200"
        >
          {expanded ? 'Ver menos' : `Ver todos (${workouts.length})`}
        </button>
      )}

      {prs.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-medium text-white">Récords personales</h2>
          <ul className="flex flex-col gap-2">
            {visiblePrs.map((pr, i) => (
              <li key={pr.exercise}>
                <Link
                  to={`/deporte/gimnasio/ejercicio/${encodeURIComponent(pr.exercise)}`}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 hover:border-slate-700 shadow-sm"
                >
                  <span className="flex items-center gap-2 text-sm">
                    {i < 3 && <span className="text-lg">{MEDALS[i]}</span>}
                    {pr.exercise}
                  </span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">
                      {pr.weight} kg × {pr.reps}
                    </span>
                    {pr.date && (
                      <span className="text-white">
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
          {remainingPrs > 0 && (
            <button
              onClick={() => setPrsExpanded((e) => !e)}
              className="mt-4 w-full rounded-lg border border-slate-800 py-2.5 text-sm text-white hover:border-slate-600 hover:text-slate-200"
            >
              {prsExpanded ? 'Ver menos' : `Ver todos (${prs.length})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
