import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { todayKey } from '../lib/dates'
import { supabase } from '../lib/supabaseClient'

const EXPORT_TABLES = [
  'workouts',
  'workout_sets',
  'body_weight_logs',
  'step_logs',
  'running_sessions',
  'running_plan_days',
  'diet_logs',
  'study_sessions',
  'study_plan_days',
  'calendar_events',
]

async function fetchAllRows(table) {
  const pageSize = 1000
  let from = 0
  let all = []
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1)
    if (error) throw error
    all = all.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

const navItems = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/deporte', label: 'Deporte', icon: '🏋️' },
  { to: '/dieta', label: 'Dieta', icon: '🍎' },
  { to: '/estudio', label: 'Estudio', icon: '📚' },
  { to: '/calendario', label: 'Calendario', icon: '🗓️' },
]

const deporteTabs = [
  { to: '/deporte/gimnasio', label: 'Gimnasio', icon: '🏋️' },
  { to: '/deporte/carrera', label: 'Carrera', icon: '🏃' },
  { to: '/deporte/pasos', label: 'Pasos', icon: '👟' },
  { to: '/deporte/fisico', label: 'Físico', icon: '📸' },
]

function NavItems({ orientation }) {
  const base =
    orientation === 'bottom'
      ? 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs'
      : 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm'

  return navItems.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `${base} ${
          isActive
            ? 'text-violet-600 font-medium'
            : 'text-slate-600 hover:text-slate-800'
        }`
      }
    >
      <span aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  ))
}

export default function Layout() {
  const { signOut } = useAuth()
  const location = useLocation()
  const inDeporte = location.pathname.startsWith('/deporte')
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const result = {}
      for (const table of EXPORT_TABLES) {
        result[table] = await fetchAllRows(table)
      }
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trackmyprogress-export-${todayKey()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Error al exportar: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Cabecera + submenú de Deporte (si aplica): fijos juntos arriba, no se pierden al hacer scroll */}
      <div className="sticky top-0 z-10">
        <header className="safe-top flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <span className="text-lg font-semibold">
            Track<span className="text-violet-600">MyProgress</span>
          </span>
          <nav className="hidden gap-1 md:flex">
            <NavItems orientation="top" />
          </nav>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              disabled={exporting}
              title="Exportar todos tus datos en un archivo JSON"
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              {exporting ? 'Exportando...' : 'Exportar'}
            </button>
            <button
              onClick={signOut}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {inDeporte && (
          <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur">
            {deporteTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm ${
                    isActive
                      ? 'border-violet-500 bg-violet-500/10 text-violet-600'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-800'
                  }`
                }
              >
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      <main className="flex-1 px-4 py-6 pb-24 md:pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <Outlet />
        </div>
      </main>

      {/* Bottom tab bar: mobile only */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white/90 backdrop-blur md:hidden">
        <NavItems orientation="bottom" />
      </nav>
    </div>
  )
}
