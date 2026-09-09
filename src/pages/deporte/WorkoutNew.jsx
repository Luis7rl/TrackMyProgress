import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import WorkoutForm from './WorkoutForm'

export default function WorkoutNew() {
  const navigate = useNavigate()

  async function handleCreate({ date, notes, exercises }) {
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({ date, notes })
      .select()
      .single()

    if (workoutError) throw workoutError

    const rows = []
    exercises.forEach((ex) => {
      ex.sets.forEach((s, i) => {
        rows.push({
          workout_id: workout.id,
          exercise_name: ex.name,
          set_number: i + 1,
          reps: Number(s.reps),
          weight_kg: Number(s.weight),
          order_index: rows.length,
        })
      })
    })

    const { error: setsError } = await supabase.from('workout_sets').insert(rows)
    if (setsError) throw setsError

    navigate(`/deporte/gimnasio/${workout.id}`)
  }

  return (
    <WorkoutForm title="Nuevo entrenamiento" submitLabel="Guardar entrenamiento" onSubmit={handleCreate} />
  )
}
