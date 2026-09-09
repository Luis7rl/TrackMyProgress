import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

const VISIBLE_LIMIT = 10

export default function Gimnasio() {
  const [workouts, setWorkouts] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

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

  const visible = expanded ? workouts : workouts?.slice(0, VISIBLE_LIMIT)
  const remaining = workouts ? workouts.length - VISIBLE_LIMIT : 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Gimnasio</h1>
          {workouts && <p className="text-sm text-slate-500">{workouts.length} entrenamientos</p>}
        </div>
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

      {error && <p className="text-sm text-red-400">{error}</p>}

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
