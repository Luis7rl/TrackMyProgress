import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, date, notes, workout_sets(count)')
        .order('date', { ascending: false })

      if (!active) return
      if (error) {
        setError(error.message)
        return
      }
      setWorkouts(data)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Historial</h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {workouts === null && !error && (
        <p className="text-sm text-slate-500">Cargando...</p>
      )}

      {workouts?.length === 0 && (
        <p className="text-sm text-slate-500">
          Todavía no has registrado ningún entrenamiento.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {workouts?.map((w) => (
          <li key={w.id}>
            <Link
              to={`/entrenamientos/${w.id}`}
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
    </div>
  )
}
