import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/deporte/gimnasio', label: 'Gimnasio', icon: '🏋️' },
  { to: '/deporte/carrera', label: 'Carrera', icon: '🏃' },
  { to: '/deporte/pasos', label: 'Pasos', icon: '👟' },
  { to: '/deporte/fisico', label: 'Físico', icon: '📸' },
]

export default function DeporteLayout() {
  return (
    <div>
      <nav className="mb-6 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm ${
                isActive
                  ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                  : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`
            }
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
