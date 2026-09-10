import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { user, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await signUp(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    // Si la confirmación por email está desactivada, Supabase ya devuelve
    // sesión activa: el AuthContext la recoge solo y el guard de arriba
    // (if (user) ...) redirige a "/". Si no hay sesión, sí hace falta confirmar.
    if (!data.session) {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-slate-900">
        <div className="max-w-sm">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">Revisa tu email</h1>
          <p className="text-sm text-slate-600">
            Te hemos enviado un enlace de confirmación a <b>{email}</b>. Confírmalo y
            luego inicia sesión.
          </p>
          <Link to="/login" className="mt-6 inline-block text-violet-600 hover:underline">
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-slate-900">Crear cuenta</h1>
        <p className="mb-8 text-center text-sm text-slate-600">
          Empieza a llevar tu progreso
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Contraseña (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-violet-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
