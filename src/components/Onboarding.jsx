import { useEffect, useState } from 'react'
import { DEFAULT_MODULES, MODULE_INFO, saveModuleSettings } from '../lib/moduleSettings'
import { createProfile, fetchProfile, USERNAME_PATTERN } from '../lib/profile'

const DEPORTE_MODULES = MODULE_INFO.filter((m) => m.group === 'deporte')

const YES_NO_STEPS = [
  { key: 'dieta', question: '¿Vas a llevar el registro de tu alimentación?', icon: '🍎' },
  { key: 'estudio', question: '¿Vas a usar la app para estudiar (horario, notas, sesiones)?', icon: '📚' },
  { key: 'calendario', question: '¿Quieres usar el Calendario?', icon: '🗓️' },
]

// Paso 0: Deporte (multi-selección, sin respuesta obligatoria). Pasos 1-3:
// Dieta/Estudio/Calendario (sí/no obligatorio).
const TOTAL_STEPS = 1 + YES_NO_STEPS.length

const HERO_CARD =
  'rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-600/20 via-slate-900/50 to-slate-900/50 shadow-lg shadow-violet-600/10'

function initialModules() {
  const modules = { ...DEFAULT_MODULES }
  // Ninguna respuesta de sí/no viene premarcada: hay que elegirla a propósito.
  YES_NO_STEPS.forEach((s) => {
    modules[s.key] = null
  })
  return modules
}

function WelcomeUsernameForm({ onSaved }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!USERNAME_PATTERN.test(value)) {
      setError('Debe tener entre 3 y 20 caracteres (letras, números o "_").')
      return
    }

    setSaving(true)
    try {
      await createProfile(value)
      onSaved(value)
    } catch (err) {
      setError(err.message.includes('duplicate') ? 'Ese nombre ya está en uso.' : err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
      <p className="text-sm text-white">¿Cómo te llamamos?</p>
      <input
        type="text"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tu nombre de usuario"
        className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-center text-sm text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Continuar'}
      </button>
    </form>
  )
}

export default function Onboarding({ onDone }) {
  const [started, setStarted] = useState(false)
  const [username, setUsername] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [step, setStep] = useState(0)
  const [modules, setModules] = useState(initialModules)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
      .then((p) => setUsername(p?.username ?? null))
      .catch(() => {})
      .finally(() => setLoadingProfile(false))
  }, [])

  async function finish(finalModules) {
    setSaving(true)
    setError('')
    try {
      await saveModuleSettings(finalModules)
      onDone(finalModules)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  function next() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1)
    } else {
      finish(modules)
    }
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1))
  }

  function skip() {
    finish(DEFAULT_MODULES)
  }

  function toggleDeporteModule(key) {
    setModules((m) => ({ ...m, [key]: !m[key] }))
  }

  function setYesNo(key, value) {
    setModules((m) => ({ ...m, [key]: value }))
  }

  const canProceed = step === 0 ? true : modules[YES_NO_STEPS[step - 1].key] != null

  if (!started) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className={`w-full max-w-sm px-8 py-10 text-center ${HERO_CARD}`}>
          {loadingProfile ? (
            <p className="text-sm text-white">Cargando...</p>
          ) : username ? (
            <>
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-100">
                Bienvenido/a, <span className="text-violet-400">{username}</span>
              </h1>
              <p className="mb-8 text-sm text-white">
                Track<span className="text-violet-500">MyProgress</span> se adapta a ti: vamos a
                elegir qué secciones quieres ver.
              </p>
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
              >
                Empezar
              </button>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-100">Bienvenido/a</h1>
              <p className="mb-6 text-sm text-white">
                Track<span className="text-violet-500">MyProgress</span> se adapta a ti.
              </p>
              <WelcomeUsernameForm onSaved={setUsername} />
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i === step ? 'bg-violet-500' : 'bg-slate-800'}`}
            />
          ))}
        </div>

        <div className={`px-6 py-8 ${HERO_CARD}`}>
          <h1 className="mb-1 text-center text-xl font-bold tracking-tight text-slate-100">
            Track<span className="text-violet-500">MyProgress</span>
          </h1>
          <p className="mb-8 text-center text-sm text-white">
            Vamos a personalizar qué secciones ves
          </p>

          {step === 0 ? (
            <div>
              <p className="mb-4 text-center text-sm text-white">
                🏋️ ¿Qué quieres registrar en Deporte? Elige las que te interesen.
              </p>
              <div className="mb-2 flex flex-col gap-2">
                {DEPORTE_MODULES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleDeporteModule(m.key)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                      modules[m.key]
                        ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                        : 'border-slate-800 text-white hover:border-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true">{m.icon}</span>
                      {m.label}
                    </span>
                    {modules[m.key] && <span aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            (() => {
              const s = YES_NO_STEPS[step - 1]
              return (
                <div>
                  <p className="mb-4 text-center text-sm text-white">
                    {s.icon} {s.question}
                  </p>
                  <div className="mb-2 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setYesNo(s.key, true)}
                      className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                        modules[s.key] === true
                          ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                          : 'border-slate-800 text-white hover:border-slate-600'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setYesNo(s.key, false)}
                      className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                        modules[s.key] === false
                          ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                          : 'border-slate-800 text-white hover:border-slate-600'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )
            })()
          )}
        </div>

        {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={prev}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm text-white hover:text-slate-200 disabled:opacity-50"
            >
              Anterior
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={next}
            disabled={saving || !canProceed}
            className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : step < TOTAL_STEPS - 1 ? 'Siguiente' : 'Terminar'}
          </button>
        </div>

        <p className="mt-4 text-center">
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            className="text-sm text-white hover:text-slate-200 disabled:opacity-50"
          >
            Saltar, ya lo configuro yo
          </button>
        </p>
      </div>
    </div>
  )
}
