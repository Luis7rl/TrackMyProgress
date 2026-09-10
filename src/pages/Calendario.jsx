import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TYPE_OPTIONS = [
  { value: 'tarea', label: 'Tarea', dot: 'bg-violet-500' },
  { value: 'entrenamiento', label: 'Entrenamiento', dot: 'bg-emerald-500' },
  { value: 'plan', label: 'Plan', dot: 'bg-amber-500' },
]

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayKey() {
  const t = new Date()
  return toKey(t.getFullYear(), t.getMonth(), t.getDate())
}

export default function Calendario() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(todayKey())
  const [events, setEvents] = useState(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('tarea')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }
    setEvents(data)
  }

  useEffect(() => {
    load()
  }, [])

  const eventsByDate = useMemo(() => {
    const map = {}
    events?.forEach((e) => {
      ;(map[e.date] ??= []).push(e)
    })
    return map
  }, [events])

  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function changeMonth(delta) {
    let newMonth = month + delta
    let newYear = year
    if (newMonth < 0) {
      newMonth = 11
      newYear -= 1
    } else if (newMonth > 11) {
      newMonth = 0
      newYear += 1
    }
    setMonth(newMonth)
    setYear(newYear)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from('calendar_events').insert({
      date: selected,
      title: title.trim(),
      type,
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setTitle('')
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)

  const selectedEvents = eventsByDate[selected] ?? []
  const selectedLabel = new Date(`${selected}T00:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Calendario</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <p className="text-sm font-medium">
            {MONTH_NAMES[month]} {year}
          </p>
          <button
            onClick={() => changeMonth(1)}
            className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />
            const key = toKey(year, month, day)
            const dayEvents = eventsByDate[key] ?? []
            const isSelected = key === selected
            const isToday = key === todayKey()
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm ${
                  isSelected
                    ? 'bg-violet-600 font-medium text-white'
                    : isToday
                      ? 'border border-violet-500 text-slate-700'
                      : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {day}
                {dayEvents.length > 0 && (
                  <span className="flex gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={`h-1 w-1 rounded-full ${
                          isSelected
                            ? 'bg-white'
                            : TYPE_OPTIONS.find((t) => t.value === e.type)?.dot ?? 'bg-violet-500'
                        }`}
                      />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <p className="mb-3 text-sm font-medium capitalize text-slate-600">{selectedLabel}</p>

      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
          Título
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Entrega proyecto"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Tipo
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? 'Añadiendo...' : 'Añadir'}
        </button>
      </form>

      {selectedEvents.length === 0 ? (
        <p className="text-sm text-slate-500">Sin eventos este día.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {selectedEvents.map((e) => {
            const opt = TYPE_OPTIONS.find((t) => t.value === e.type)
            return (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${opt?.dot ?? 'bg-violet-500'}`} />
                  <span className="text-sm">{e.title}</span>
                  <span className="text-xs text-slate-500">{opt?.label}</span>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-slate-500 hover:text-red-600"
                  aria-label="Eliminar evento"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
