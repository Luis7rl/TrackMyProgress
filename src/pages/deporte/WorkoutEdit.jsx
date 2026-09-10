import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import WorkoutForm from './WorkoutForm'

export default function WorkoutEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [initial, setInitial] = useState(null)
  const [hasExtraData, setHasExtraData] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: w, error: wErr }, { data: s, error: sErr }] = await Promise.all([
        supabase.from('workouts').select('*').eq('id', id).single(),
        supabase
          .from('workout_sets')
          .select('*')
          .eq('workout_id', id)
          .order('order_index', { ascending: true }),
      ])

      if (wErr || sErr) {
        setError((wErr || sErr).message)
        return
      }

      const extra = s.some(
        (row) =>
          (row.set_type && row.set_type !== 'normal') ||
          row.rpe != null ||
          row.distance_km != null ||
          row.duration_seconds != null,
      )
      setHasExtraData(extra)

      const exercises = []
      const byName = new Map()
      s.forEach((row) => {
        if (!byName.has(row.exercise_name)) {
          const ex = { name: row.exercise_name, sets: [] }
          byName.set(row.exercise_name, ex)
          exercises.push(ex)
        }
        byName.get(row.exercise_name).sets.push({
          reps: row.reps != null ? String(row.reps) : '',
          weight: row.weight_kg != null ? String(row.weight_kg) : '',
        })
      })

      setInitial({ date: w.date, notes: w.notes ?? '', exercises })
    }

    load()
  }, [id])

  async function handleUpdate({ date, notes, exercises }) {
    const { error: updateError } = await supabase.from('workouts').update({ date, notes }).eq('id', id)
    if (updateError) throw updateError

    const { error: deleteError } = await supabase.from('workout_sets').delete().eq('workout_id', id)
    if (deleteError) throw deleteError

    const rows = []
    exercises.forEach((ex) => {
      ex.sets.forEach((s, i) => {
        rows.push({
          workout_id: id,
          exercise_name: ex.name,
          set_number: i + 1,
          reps: Number(s.reps),
          weight_kg: Number(s.weight),
          order_index: rows.length,
        })
      })
    })

    const { error: insertError } = await supabase.from('workout_sets').insert(rows)
    if (insertError) throw insertError

    navigate(`/deporte/gimnasio/${id}`)
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!initial) return <p className="text-sm text-slate-500">Cargando...</p>

  return (
    <WorkoutForm
      key={id}
      title="Editar entrenamiento"
      initialDate={initial.date}
      initialNotes={initial.notes}
      initialExercises={initial.exercises}
      submitLabel="Guardar cambios"
      onSubmit={handleUpdate}
      warning={
        hasExtraData
          ? 'Este entrenamiento tiene datos de cardio, RPE o tipo de serie (probablemente importado de Hevy). Guardar aquí los sustituye por series simples de reps y peso, perdiendo esos datos extra.'
          : undefined
      }
    />
  )
}
