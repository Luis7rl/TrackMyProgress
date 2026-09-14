import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-slate-100">
          Track<span className="text-violet-500">MyProgress</span>
        </h1>
        <p className="mb-8 text-center text-sm text-white">
          Inicia sesión para ver tu progreso
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 pr-11 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-white hover:text-slate-200"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-violet-500 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
