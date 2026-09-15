import { useState } from 'react'
import { DEFAULT_MODULES, MODULE_INFO, saveModuleSettings } from '../lib/moduleSettings'

const DEPORTE_MODULES = MODULE_INFO.filter((m) => m.group === 'deporte')

const YES_NO_STEPS = [
  { key: 'dieta', question: '¿Vas a llevar el registro de tu alimentación?', icon: '🍎' },
  { key: 'estudio', question: '¿Vas a usar la app para estudiar (horario, notas, sesiones)?', icon: '📚' },
  { key: 'calendario', question: '¿Quieres usar el Calendario?', icon: '🗓️' },
]

// Paso 0: Deporte (multi-selección). Pasos 1-3: Dieta/Estudio/Calendario (sí/no).
const TOTAL_STEPS = 1 + YES_NO_STEPS.length

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [modules, setModules] = useState(DEFAULT_MODULES)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  function skip() {
    finish(DEFAULT_MODULES)
  }

  function toggleDeporteModule(key) {
    setModules((m) => ({ ...m, [key]: !m[key] }))
  }

  function setYesNo(key, value) {
    setModules((m) => ({ ...m, [key]: value }))
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
            <div className="mb-6 flex flex-col gap-2">
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
                <div className="mb-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setYesNo(s.key, true)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      modules[s.key]
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
                      !modules[s.key]
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

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            className="text-sm text-white hover:text-slate-200 disabled:opacity-50"
          >
            Saltar, ya lo configuro yo
          </button>
          <button
            type="button"
            onClick={next}
            disabled={saving}
            className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : step < TOTAL_STEPS - 1 ? 'Siguiente' : 'Terminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
