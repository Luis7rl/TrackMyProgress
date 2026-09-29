import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isAdmin } from '../lib/adminUser'

// Segunda barrera además de ocultar el enlace en el menú: si alguien
// escribe la URL a mano sin ser la cuenta admitida, se le redirige a Inicio.
export default function AdminRoute() {
  const { user } = useAuth()
  if (!isAdmin(user)) return <Navigate to="/" replace />
  return <Outlet />
}
