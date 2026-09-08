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
    const { error } = await signUp(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
        <div className="max-w-sm">
          <h1 className="mb-2 text-xl font-semibold">Revisa tu email</h1>
          <p className="text-sm text-slate-400">
            Te hemos enviado un enlace de confirmación a <b>{email}</b>. Confírmalo y
            luego inicia sesión.
          </p>
          <Link to="/login" className="mt-6 inline-block text-blue-500 hover:underline">
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold">Crear cuenta</h1>
        <p className="mb-8 text-center text-sm text-slate-400">
          Empieza a llevar tu progreso
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Contraseña (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-blue-500 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
