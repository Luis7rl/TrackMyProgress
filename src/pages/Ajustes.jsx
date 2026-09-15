import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchProfile } from '../lib/profile'
import { supabase } from '../lib/supabaseClient'

function EmailForm({ currentEmail }) {
  const { updateEmail } = useAuth()
  const [email, setEmail] = useState(currentEmail)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (email === currentEmail) return

    setLoading(true)
    const { error } = await updateEmail(email)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess('Revisa tu bandeja de entrada para confirmar el nuevo correo.')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="text-sm text-white">Email</label>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
        />
        <button
          type="submit"
          disabled={loading || email === currentEmail}
          className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Cambiar'}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}
    </form>
  )
}

function PasswordForm() {
  const { user, updatePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('Las nuevas contraseñas no coinciden.')
      return
    }

    setLoading(true)

    // Verificamos la contraseña actual reautenticando antes de cambiarla.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) {
      setLoading(false)
      setError('La contraseña actual no es correcta.')
      return
    }

    const { error } = await updatePassword(newPassword)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess('Contraseña actualizada.')
  }

  const inputType = showPasswords ? 'text' : 'password'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-sm text-white">Cambiar contraseña</label>

      <div className="relative">
        <input
          type={inputType}
          required
          placeholder="Contraseña actual"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 pr-11 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
        />
        <button
          type="button"
          onClick={() => setShowPasswords((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-white hover:text-slate-200"
          aria-label={showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
        >
          {showPasswords ? '🙈' : '👁️'}
        </button>
      </div>
      <input
        type={inputType}
        required
        minLength={6}
        placeholder="Nueva contraseña (mín. 6 caracteres)"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
      />
      <input
        type={inputType}
        required
        minLength={6}
        placeholder="Repite la nueva contraseña"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 self-start"
      >
        {loading ? 'Guardando...' : 'Actualizar contraseña'}
      </button>
    </form>
  )
}

export default function Ajustes() {
  const { user } = useAuth()
  const [username, setUsername] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
      .then((p) => setUsername(p?.username ?? null))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-500">
        ⚙️ Ajustes
      </h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <h2 className="mb-3 text-sm font-medium text-white">Mi cuenta</h2>

      <div className="flex flex-col gap-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-white">Nombre de usuario</label>
          <p className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-white">
            {username ?? '—'}
          </p>
        </div>

        <EmailForm currentEmail={user.email} />

        <PasswordForm />
      </div>
    </div>
  )
}
