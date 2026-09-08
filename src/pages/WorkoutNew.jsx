import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function emptySet() {
  return { reps: '', weight: '' }
}

function emptyExercise() {
  return { name: '', sets: [emptySet()] }
}

export default function WorkoutNew() {
  const navigate = useNavigate()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState([emptyExercise()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateExerciseName(i, name) {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, name } : ex)))
  }

  function updateSet(exIdx, setIdx, field, value) {
    setExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exIdx) return ex
        const sets = ex.sets.map((s, sIdx) => (sIdx === setIdx ? { ...s, [field]: value } : s))
        return { ...ex, sets }
      }),
    )
  }

  function addExercise() {
    setExercises((prev) => [...prev, emptyExercise()])
  }

  function removeExercise(i) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i))
  }

  function addSet(exIdx) {
    setExercises((prev) =>
      prev.map((ex, idx) => (idx === exIdx ? { ...ex, sets: [...ex.sets, emptySet()] } : ex)),
    )
  }

  function removeSet(exIdx, setIdx) {
    setExercises((prev) =>
      prev.map((ex, idx) =>
        idx === exIdx ? { ...ex, sets: ex.sets.filter((_, sIdx) => sIdx !== setIdx) } : ex,
      ),
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanExercises = exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets.filter((s) => s.reps !== '' && s.weight !== ''),
      }))
      .filter((ex) => ex.sets.length > 0)

    if (cleanExercises.length === 0) {
      setError('Añade al menos un ejercicio con una serie (reps y peso).')
      return
    }

    setSaving(true)
    try {
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({ date, notes: notes.trim() || null })
        .select()
        .single()

      if (workoutError) throw workoutError

      const rows = []
      cleanExercises.forEach((ex) => {
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

      navigate(`/entrenamientos/${workout.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Nuevo entrenamiento</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-400">
            Fecha
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-400">
            Notas (opcional)
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. día de empuje"
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
            />
          </label>
        </div>

        <div className="flex flex-col gap-4">
          {exercises.map((ex, exIdx) => (
            <div key={exIdx} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ejercicio (ej. Press banca)"
                  value={ex.name}
                  onChange={(e) => updateExerciseName(exIdx, e.target.value)}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
                {exercises.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExercise(exIdx)}
                    className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:text-red-400"
                    aria-label="Eliminar ejercicio"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {ex.sets.map((s, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs text-slate-500">{setIdx + 1}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Reps"
                      value={s.reps}
                      onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-violet-500"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Kg"
                      value={s.weight}
                      onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-violet-500"
                    />
                    {ex.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSet(exIdx, setIdx)}
                        className="px-1 text-slate-500 hover:text-red-400"
                        aria-label="Eliminar serie"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addSet(exIdx)}
                className="mt-3 text-sm text-violet-500 hover:underline"
              >
                + Añadir serie
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addExercise}
          className="rounded-lg border border-dashed border-slate-700 py-2.5 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-200"
        >
          + Añadir ejercicio
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 py-3 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar entrenamiento'}
        </button>
      </form>
    </div>
  )
}
