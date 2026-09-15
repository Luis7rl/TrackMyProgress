import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await resetPasswordForEmail(email)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
        <div className="max-w-sm">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-100">Revisa tu email</h1>
          <p className="text-sm text-white">
            Si <b>{email}</b> tiene una cuenta, te hemos enviado un enlace para restablecer la
            contraseña.
          </p>
          <Link to="/login" className="mt-6 inline-block text-violet-500 hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-slate-100">
          Recuperar contraseña
        </h1>
        <p className="mb-8 text-center text-sm text-white">
          Te enviaremos un enlace a tu email para restablecerla
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white">
          <Link to="/login" className="text-violet-500 hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
