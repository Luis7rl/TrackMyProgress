import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function mondayOf(date) {
  const d = new Date(date)
  const diff = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function computeWeekStreak(dates) {
  const weeks = new Set(dates.map((d) => mondayOf(`${d}T00:00:00`).toISOString().slice(0, 10)))
  let streak = 0
  let cursor = mondayOf(new Date())
  let isCurrentWeek = true

  for (;;) {
    const key = cursor.toISOString().slice(0, 10)
    if (weeks.has(key)) {
      streak++
    } else if (!isCurrentWeek) {
      break
    }
    isCurrentWeek = false
    cursor.setDate(cursor.getDate() - 7)
  }

  return streak
}

export default function Dashboard() {
  const [streak, setStreak] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      const { data, error } = await supabase.from('workouts').select('date')

      if (!active) return
      if (error) {
        setError(error.message)
        return
      }
      setStreak(computeWeekStreak(data.map((w) => w.date)))
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col items-center pt-10 text-center">
      <h1 className="mb-8 text-xl font-semibold">Hola 👋</h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/50 px-10 py-8">
        <span className="text-5xl">🔥</span>
        <p className="mt-3 text-5xl font-bold text-violet-400">
          {streak === null ? '—' : streak}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {streak === 1 ? 'semana seguida entrenando' : 'semanas seguidas entrenando'}
        </p>
      </div>

      <Link to="/deporte/gimnasio" className="mt-8 text-sm text-violet-500 hover:underline">
        Ir a Deporte →
      </Link>
    </div>
  )
}
