import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/entrenamientos/nuevo', label: 'Nuevo', icon: '➕' },
  { to: '/historial', label: 'Historial', icon: '📋' },
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
            ? 'text-blue-500 font-medium'
            : 'text-slate-400 hover:text-slate-200'
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

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Top bar: visible on desktop, also shows on mobile as a simple header */}
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <span className="text-lg font-semibold">
          Track<span className="text-blue-500">MyProgress</span>
        </span>
        <nav className="hidden gap-1 md:flex">
          <NavItems orientation="top" />
        </nav>
        <button
          onClick={signOut}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="flex-1 px-4 py-6 pb-24 md:pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <Outlet />
        </div>
      </main>

      {/* Bottom tab bar: mobile only */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
        <NavItems orientation="bottom" />
      </nav>
    </div>
  )
}
