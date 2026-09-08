import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const SET_TYPE_LABELS = {
  warmup: 'Calentamiento',
  failure: 'Fallo',
  dropset: 'Dropset',
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function WorkoutDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState(null)
  const [sets, setSets] = useState([])
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      const [{ data: w, error: wErr }, { data: s, error: sErr }] = await Promise.all([
        supabase.from('workouts').select('*').eq('id', id).single(),
        supabase
          .from('workout_sets')
          .select('*')
          .eq('workout_id', id)
          .order('order_index', { ascending: true }),
      ])

      if (!active) return
      if (wErr || sErr) {
        setError((wErr || sErr).message)
        return
      }
      setWorkout(w)
      setSets(s)
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  async function handleDelete() {
    if (!confirm('¿Eliminar este entrenamiento? No se puede deshacer.')) return
    setDeleting(true)
    const { error } = await supabase.from('workouts').delete().eq('id', id)
    setDeleting(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/historial')
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>
  if (!workout) return <p className="text-sm text-slate-500">Cargando...</p>

  const grouped = sets.reduce((acc, s) => {
    ;(acc[s.exercise_name] ??= []).push(s)
    return acc
  }, {})

  return (
    <div>
      <Link to="/historial" className="mb-4 inline-block text-sm text-blue-500 hover:underline">
        ← Historial
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {new Date(workout.date + 'T00:00:00').toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h1>
          {workout.notes && <p className="mt-1 text-sm text-slate-400">{workout.notes}</p>}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(grouped).map(([exerciseName, exSets]) => (
          <div key={exerciseName} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="mb-3 font-medium">{exerciseName}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="w-10 font-normal">Serie</th>
                  <th className="font-normal">Reps</th>
                  <th className="font-normal">Peso</th>
                  <th className="font-normal">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {exSets.map((s) => {
                  const isCardio = s.reps == null && s.weight_kg == null
                  return (
                    <tr key={s.id} className="border-t border-slate-800/60">
                      <td className="py-1.5 text-slate-500">{s.set_number}</td>
                      <td className="py-1.5">
                        {isCardio
                          ? s.duration_seconds
                            ? formatDuration(s.duration_seconds)
                            : '—'
                          : (s.reps ?? '—')}
                      </td>
                      <td className="py-1.5">
                        {isCardio
                          ? s.distance_km
                            ? `${s.distance_km} km`
                            : '—'
                          : s.weight_kg != null
                            ? `${s.weight_kg} kg`
                            : '—'}
                      </td>
                      <td className="py-1.5 text-slate-500">
                        <div className="flex flex-wrap gap-1">
                          {s.set_type && s.set_type !== 'normal' && (
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
                              {SET_TYPE_LABELS[s.set_type] ?? s.set_type}
                            </span>
                          )}
                          {s.rpe != null && (
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
                              RPE {s.rpe}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
