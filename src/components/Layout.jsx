import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { DEFAULT_MODULES, fetchModuleSettings } from '../lib/moduleSettings'

const ALL_NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/deporte', label: 'Deporte', icon: '🏋️' },
  { to: '/dieta', label: 'Dieta', icon: '🍎', moduleKey: 'dieta' },
  { to: '/estudio', label: 'Estudio', icon: '📚', moduleKey: 'estudio' },
  { to: '/calendario', label: 'Calendario', icon: '🗓️', moduleKey: 'calendario' },
]

const ALL_DEPORTE_TABS = [
  { to: '/deporte/gimnasio', label: 'Gimnasio', icon: '🏋️', moduleKey: 'gimnasio' },
  { to: '/deporte/carrera', label: 'Carrera', icon: '🏃', moduleKey: 'carrera' },
  { to: '/deporte/pasos', label: 'Pasos', icon: '👟', moduleKey: 'pasos' },
  { to: '/deporte/fisico', label: 'Físico', icon: '📸', moduleKey: 'fisico' },
]

const ESTUDIO_TABS = [
  { to: '/estudio/horario', label: 'Horario', icon: '🗓️' },
  { to: '/estudio/notas', label: 'Notas', icon: '📝' },
  { to: '/estudio/sesiones', label: 'Sesiones', icon: '⏱️' },
]

function NavItems({ orientation, items }) {
  const base =
    orientation === 'bottom'
      ? 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs'
      : 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm'

  return items.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `${base} transition-colors ${
          isActive
            ? 'text-violet-500 font-medium'
            : 'text-white hover:text-slate-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={
              orientation === 'bottom' && isActive
                ? 'rounded-full bg-violet-500/20 px-2.5 py-0.5'
                : undefined
            }
          >
            {item.icon}
          </span>
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  ))
}

export default function Layout() {
  const { signOut } = useAuth()
  const confirm = useConfirm()
  const location = useLocation()
  const inDeporte = location.pathname.startsWith('/deporte')
  const inEstudio = location.pathname.startsWith('/estudio')
  const [modules, setModules] = useState(DEFAULT_MODULES)

  useEffect(() => {
    fetchModuleSettings()
      .then(setModules)
      .catch(() => {})
  }, [])

  const deporteTabs = ALL_DEPORTE_TABS.filter((tab) => modules[tab.moduleKey])
  const navItems = ALL_NAV_ITEMS.filter(
    (item) => !item.moduleKey || modules[item.moduleKey],
  ).filter((item) => item.to !== '/deporte' || deporteTabs.length > 0)

  async function handleSignOut() {
    if (await confirm('¿Cerrar sesión?')) signOut()
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Cabecera + submenú de Deporte (si aplica): fijos juntos arriba, no se pierden al hacer scroll */}
      <div className="sticky top-0 z-10">
        <header className="safe-top flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 shadow-sm backdrop-blur">
          <span className="text-xl font-bold tracking-tight text-slate-100">
            Track<span className="text-violet-500">MyProgress</span>
          </span>
          <nav className="hidden gap-1 md:flex">
            <NavItems orientation="top" items={navItems} />
          </nav>
          <div className="flex items-center gap-1">
            <Link
              to="/ajustes"
              title="Ajustes"
              aria-label="Ajustes"
              className="rounded-lg px-3 py-1.5 text-sm text-white hover:bg-slate-800 hover:text-slate-100"
            >
              ⚙️
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded-lg px-3 py-1.5 text-sm text-white hover:bg-slate-800 hover:text-slate-100"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {(inDeporte || inEstudio) && (
          <nav className="flex gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950/95 px-4 py-2 backdrop-blur">
            {(inDeporte ? deporteTabs : ESTUDIO_TABS).map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-violet-500 bg-violet-500/10 text-violet-500 shadow-sm'
                      : 'border-slate-800 text-white hover:border-slate-600 hover:text-slate-200'
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
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
        <NavItems orientation="bottom" items={navItems} />
      </nav>
    </div>
  )
}
