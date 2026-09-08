import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      const [{ count, error: countErr }, { data, error: dataErr }] = await Promise.all([
        supabase.from('workouts').select('*', { count: 'exact', head: true }),
        supabase
          .from('workouts')
          .select('id, date, notes')
          .order('date', { ascending: false })
          .limit(3),
      ])

      if (!active) return
      if (countErr || dataErr) {
        setError((countErr || dataErr).message)
        return
      }
      setStats({ total: count ?? 0 })
      setRecent(data)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Hola 👋</h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-2xl font-semibold">{stats?.total ?? '—'}</p>
          <p className="text-sm text-slate-500">Entrenamientos totales</p>
        </div>
        <Link
          to="/entrenamientos/nuevo"
          className="flex flex-col items-center justify-center rounded-xl bg-blue-600 p-4 text-center hover:bg-blue-500"
        >
          <p className="text-lg font-medium">+ Nuevo</p>
          <p className="text-sm text-blue-100">Registrar entrenamiento</p>
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-medium text-slate-400">Últimos entrenamientos</h2>

      {recent.length === 0 && (
        <p className="text-sm text-slate-500">Aún no hay entrenamientos registrados.</p>
      )}

      <ul className="flex flex-col gap-3">
        {recent.map((w) => (
          <li key={w.id}>
            <Link
              to={`/entrenamientos/${w.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 hover:border-slate-700"
            >
              <span>
                {new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              {w.notes && <span className="text-sm text-slate-500">{w.notes}</span>}
            </Link>
          </li>
        ))}
      </ul>

      {recent.length > 0 && (
        <Link to="/historial" className="mt-4 inline-block text-sm text-blue-500 hover:underline">
          Ver historial completo →
        </Link>
      )}
    </div>
  )
}
