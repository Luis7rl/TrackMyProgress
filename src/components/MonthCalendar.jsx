import { useState } from 'react'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function MonthCalendar({ markedDates }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7 // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate())

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

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
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
          const trained = markedDates.has(key)
          const isToday = key === todayKey
          return (
            <div
              key={key}
              className={`flex aspect-square items-center justify-center rounded-lg text-sm ${
                trained
                  ? 'bg-violet-600 font-medium text-white'
                  : isToday
                    ? 'border border-violet-500 text-slate-700'
                    : 'text-slate-600'
              }`}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
