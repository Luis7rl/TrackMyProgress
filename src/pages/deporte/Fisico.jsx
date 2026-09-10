import { useEffect, useMemo, useState } from 'react'
import ProgressBar from '../../components/ProgressBar'
import { useAuth } from '../../context/AuthContext'
import { todayKey } from '../../lib/dates'
import { DEFAULT_GOALS, fetchGoals, saveGoal } from '../../lib/goals'
import { supabase } from '../../lib/supabaseClient'

const BUCKET = 'progress-photos'

function WeightChart({ entries }) {
  const width = 600
  const height = 180
  const padding = 24

  const points = useMemo(() => {
    if (entries.length < 2) return []
    const weights = entries.map((e) => e.weight_kg)
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const range = max - min || 1

    return entries.map((e, i) => {
      const x = padding + (i / (entries.length - 1)) * (width - padding * 2)
      const y = height - padding - ((e.weight_kg - min) / range) * (height - padding * 2)
      return { x, y, ...e }
    })
  }, [entries])

  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Añade al menos dos registros para ver la gráfica.
      </p>
    )
  }

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <path d={path} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#8b5cf6" />
      ))}
    </svg>
  )
}

function PhotoComparator({ photoEntries, photoUrls }) {
  const [dateA, setDateA] = useState(photoEntries[0]?.date ?? '')
  const [dateB, setDateB] = useState(photoEntries[photoEntries.length - 1]?.date ?? '')

  const entryA = photoEntries.find((e) => e.date === dateA)
  const entryB = photoEntries.find((e) => e.date === dateB)

  function formatLabel(dateStr) {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="mb-3 text-sm font-medium text-slate-400">Comparar fotos</p>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <select
          value={dateA}
          onChange={(e) => setDateA(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-violet-500"
        >
          {photoEntries.map((e) => (
            <option key={e.id} value={e.date}>
              {formatLabel(e.date)}
            </option>
          ))}
        </select>
        <select
          value={dateB}
          onChange={(e) => setDateB(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-violet-500"
        >
          {photoEntries.map((e) => (
            <option key={e.id} value={e.date}>
              {formatLabel(e.date)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[entryA, entryB].map((entry, i) => (
          <div key={i} className="text-center">
            {entry ? (
              <>
                <img
                  src={photoUrls[entry.id]}
                  alt={`Progreso ${entry.date}`}
                  className="aspect-[3/4] w-full rounded-lg border border-slate-800 object-cover"
                />
                <p className="mt-2 text-sm text-slate-400">{formatLabel(entry.date)}</p>
                <p className="text-sm font-medium">{entry.weight_kg} kg</p>
              </>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-slate-800 text-sm text-slate-600">
                Sin foto
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Fisico() {
  const { user } = useAuth()
  const [entries, setEntries] = useState(null)
  const [photoUrls, setPhotoUrls] = useState({})
  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [date, setDate] = useState(todayKey)
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [arm, setArm] = useState('')
  const [chest, setChest] = useState('')
  const [showMeasurements, setShowMeasurements] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('body_weight_logs')
      .select('*')
      .order('date', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }
    setEntries(data)

    const withPhotos = data.filter((e) => e.photo_path)
    if (withPhotos.length === 0) {
      setPhotoUrls({})
      return
    }
    const results = await Promise.all(
      withPhotos.map((e) => supabase.storage.from(BUCKET).createSignedUrl(e.photo_path, 3600)),
    )
    const map = {}
    withPhotos.forEach((e, i) => {
      if (!results[i].error) map[e.id] = results[i].data.signedUrl
    })
    setPhotoUrls(map)
  }

  useEffect(() => {
    load()
    fetchGoals()
      .then(setGoals)
      .catch((err) => setError(err.message))
  }, [])

  async function handleGoalBlur(value) {
    const num = value === '' ? null : Number(value)
    setGoals((g) => ({ ...g, target_weight_kg: num }))
    try {
      await saveGoal('target_weight_kg', num)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload = {
        date,
        weight_kg: Number(weight),
        waist_cm: waist ? Number(waist) : null,
        arm_cm: arm ? Number(arm) : null,
        chest_cm: chest ? Number(chest) : null,
      }

      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const photoPath = `${user.id}/${date}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(photoPath, photoFile, { upsert: true })
        if (uploadError) throw uploadError
        payload.photo_path = photoPath
      }

      const { error: upsertError } = await supabase
        .from('body_weight_logs')
        .upsert(payload, { onConflict: 'user_id,date' })
      if (upsertError) throw upsertError

      setWeight('')
      setWaist('')
      setArm('')
      setChest('')
      setPhotoFile(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entry) {
    if (!confirm('¿Eliminar este registro?')) return
    if (entry.photo_path) {
      await supabase.storage.from(BUCKET).remove([entry.photo_path])
    }
    const { error } = await supabase.from('body_weight_logs').delete().eq('id', entry.id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  const sorted = entries ? [...entries].sort((a, b) => b.date.localeCompare(a.date)) : []
  const latest = sorted[0]
  const previous = sorted[1]
  const first = entries?.[0]
  const delta = latest && previous ? Math.round((latest.weight_kg - previous.weight_kg) * 10) / 10 : null
  const photoEntries = entries?.filter((e) => photoUrls[e.id]) ?? []

  let goalPercent = null
  if (latest && first && goals.target_weight_kg != null) {
    const span = first.weight_kg - goals.target_weight_kg
    goalPercent =
      span === 0 ? 100 : Math.max(0, Math.min(100, ((first.weight_kg - latest.weight_kg) / span) * 100))
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Físico</h1>

      <form onSubmit={handleSubmit} className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Fecha
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Peso (kg)
          <input
            type="number"
            required
            min="0"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Ej. 78.4"
            className="w-32 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-slate-400">
          Foto (opcional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-200"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setShowMeasurements((v) => !v)}
        className="mb-6 text-sm text-violet-500 hover:underline"
      >
        {showMeasurements ? 'Ocultar medidas' : '+ Añadir medidas (opcional)'}
      </button>

      {showMeasurements && (
        <div className="-mt-4 mb-6 flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Cintura (cm)
            <input
              type="number"
              min="0"
              step="0.1"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              className="w-28 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Brazo (cm)
            <input
              type="number"
              min="0"
              step="0.1"
              value={arm}
              onChange={(e) => setArm(e.target.value)}
              className="w-28 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Pecho (cm)
            <input
              type="number"
              min="0"
              step="0.1"
              value={chest}
              onChange={(e) => setChest(e.target.value)}
              className="w-28 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-violet-500"
            />
          </label>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-slate-400">Objetivo de peso</span>
          <div className="flex items-center gap-1 text-sm">
            <input
              type="number"
              step="0.1"
              defaultValue={goals.target_weight_kg ?? ''}
              key={goals.target_weight_kg}
              onBlur={(e) => handleGoalBlur(e.target.value)}
              className="w-20 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-right outline-none focus:border-violet-500"
            />
            <span className="text-slate-500">kg</span>
          </div>
        </div>
        {goalPercent != null ? (
          <>
            <ProgressBar percent={goalPercent} />
            <p className="mt-2 text-xs text-slate-500">
              {Math.abs(Math.round((latest.weight_kg - goals.target_weight_kg) * 10) / 10)} kg{' '}
              {latest.weight_kg > goals.target_weight_kg ? 'por encima' : 'por debajo'} del objetivo
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500">Registra al menos un peso para ver el progreso.</p>
        )}
      </div>

      {entries === null ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no has registrado ningún peso.</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-2xl font-semibold">{latest.weight_kg} kg</p>
              <p className="text-sm text-slate-500">
                Último registro ({new Date(latest.date + 'T00:00:00').toLocaleDateString('es-ES')})
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p
                className={`text-2xl font-semibold ${
                  delta == null ? 'text-slate-500' : delta > 0 ? 'text-amber-400' : delta < 0 ? 'text-emerald-400' : ''
                }`}
              >
                {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta} kg`}
              </p>
              <p className="text-sm text-slate-500">Respecto al registro anterior</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <WeightChart entries={entries} />
          </div>

          {photoEntries.length > 0 && (
            <div className="mb-6">
              <p className="mb-3 text-sm font-medium text-slate-400">Fotos de progreso</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {photoEntries.map((entry) => (
                  <div key={entry.id} className="shrink-0 text-center">
                    <img
                      src={photoUrls[entry.id]}
                      alt={`Progreso ${entry.date}`}
                      className="h-40 w-32 rounded-lg border border-slate-800 object-cover"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(entry.date + 'T00:00:00').toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {photoEntries.length >= 2 && <PhotoComparator photoEntries={photoEntries} photoUrls={photoUrls} />}

          <ul className="flex flex-col gap-2">
            {sorted.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
              >
                <div>
                  <span className="text-sm">
                    {new Date(entry.date + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {photoUrls[entry.id] && <span className="ml-1.5">📷</span>}
                  </span>
                  {(entry.waist_cm || entry.arm_cm || entry.chest_cm) && (
                    <p className="text-xs text-slate-500">
                      {entry.waist_cm && `Cintura ${entry.waist_cm}cm `}
                      {entry.arm_cm && `Brazo ${entry.arm_cm}cm `}
                      {entry.chest_cm && `Pecho ${entry.chest_cm}cm`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{entry.weight_kg} kg</span>
                  <button
                    onClick={() => handleDelete(entry)}
                    className="text-slate-500 hover:text-red-400"
                    aria-label="Eliminar registro"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
