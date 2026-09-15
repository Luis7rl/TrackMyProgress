import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [message, setMessage] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((msg) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setMessage(msg)
    })
  }, [])

  function handle(result) {
    resolveRef.current?.(result)
    setMessage(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {message && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => handle(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-violet-500/40 bg-slate-900 p-5 shadow-lg shadow-violet-600/10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-5 text-sm text-slate-100">{message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handle(false)}
                className="rounded-lg px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handle(true)}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-600/20 hover:bg-violet-500"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider')
  return ctx
}
