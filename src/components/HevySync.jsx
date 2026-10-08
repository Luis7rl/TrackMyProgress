import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Al abrir Gimnasio se sincroniza solo si la última vez fue hace más de esto.
const AUTO_SYNC_AFTER_MS = 10 * 60 * 1000

function formatLastSync(iso) {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Botón "Sincronizar ahora" + sincronización automática al abrir la página.
// Llama a api/hevy-sync (Vercel), que es quien habla con la API de Hevy.
export default function HevySync({ onSynced }) {
  const { session } = useAuth()
  const [lastSync, setLastSync] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const autoTried = useRef(false)

  const sync = useCallback(
    async ({ silent = false } = {}) => {
      if (!session?.access_token) return
      setSyncing(true)
      setError('')
      if (!silent) setMessage('')
      try {
        const res = await fetch('/api/hevy-sync', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || `Error ${res.status}`)

        setLastSync(body.syncedAt)
        const changes = body.created + body.updated + body.deleted
        if (changes > 0) onSynced?.()
        if (!silent || changes > 0) {
          setMessage(
            changes === 0
              ? 'Todo al día.'
              : `${body.created} nuevos, ${body.updated} actualizados, ${body.deleted} borrados.`,
          )
        }
      } catch (err) {
        if (!silent) setError(err.message)
      } finally {
        setSyncing(false)
      }
    },
    [session, onSynced],
  )

  useEffect(() => {
    if (autoTried.current || !session) return
    autoTried.current = true

    supabase
      .from('hevy_sync_state')
      .select('last_synced_at')
      .maybeSingle()
      .then(({ data }) => {
        const last = data?.last_synced_at ?? null
        setLastSync(last)
        if (!last || Date.now() - new Date(last).getTime() > AUTO_SYNC_AFTER_MS) {
          sync({ silent: true })
        }
      })
  }, [session, sync])

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm shadow-sm">
      <div>
        <p className="text-white">
          Hevy · última sincronización: {syncing ? 'sincronizando…' : formatLastSync(lastSync)}
        </p>
        {message && <p className="text-slate-300">{message}</p>}
        {error && <p className="text-red-400">{error}</p>}
      </div>
      <button
        type="button"
        onClick={() => sync()}
        disabled={syncing}
        className="rounded-lg border border-violet-500/60 px-3 py-1.5 font-medium text-violet-200 transition-colors hover:bg-violet-600/20 disabled:opacity-50"
      >
        {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
      </button>
    </div>
  )
}
