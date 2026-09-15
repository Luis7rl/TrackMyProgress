import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { compressImage } from '../../lib/imageCompression'
import { supabase } from '../../lib/supabaseClient'

const BUCKET = 'progress-photos'
const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function PhotoSchedule() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [photoPath, setPhotoPath] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('study_schedule_photo')
      .select('photo_path')
      .maybeSingle()
    if (error) {
      setError(error.message)
      return
    }
    if (!data?.photo_path) {
      setPhotoPath(null)
      setPhotoUrl(null)
      return
    }
    const { data: signed, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.photo_path, 3600)
    if (signedError) {
      setError(signedError.message)
      return
    }
    setPhotoPath(data.photo_path)
    setPhotoUrl(signed.signedUrl)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleUpload(e) {
    e.preventDefault()
    if (!photoFile) return
    setError('')
    setSaving(true)
    try {
      const compressed = await compressImage(photoFile)
      const photoPath = `${user.id}/schedule.jpg`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(photoPath, compressed, { upsert: true })
      if (uploadError) throw uploadError

      const { error: upsertError } = await supabase
        .from('study_schedule_photo')
        .upsert({ photo_path: photoPath }, { onConflict: 'user_id' })
      if (upsertError) throw upsertError

      setPhotoFile(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePhoto() {
    if (!(await confirm('¿Eliminar la foto del horario?'))) return
    setError('')
    setDeleting(true)
    try {
      if (photoPath) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove([photoPath])
        if (removeError) throw removeError
      }
      const { error: updateError } = await supabase
        .from('study_schedule_photo')
        .update({ photo_path: null })
        .eq('user_id', user.id)
      if (updateError) throw updateError

      setPhotoPath(null)
      setPhotoUrl(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {photoUrl && (
        <img
          src={photoUrl}
          alt="Horario"
          className="mb-4 w-full rounded-xl border border-slate-800 object-contain"
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-violet-500"
          />
          <button
            type="submit"
            disabled={saving || !photoFile}
            className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? 'Subiendo...' : photoUrl ? 'Cambiar foto' : 'Subir foto'}
          </button>
        </form>

        {photoUrl && (
          <button
            type="button"
            onClick={handleDeletePhoto}
            disabled={deleting}
            className="rounded-lg bg-red-600 shadow-sm shadow-red-600/20 transition-colors px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            {deleting ? 'Eliminando...' : 'Eliminar foto'}
          </button>
        )}
      </div>
    </div>
  )
}

function ManualSchedule() {
  const confirm = useConfirm()
  const [entries, setEntries] = useState(null)
  const [weekday, setWeekday] = useState('0')
  const [timeLabel, setTimeLabel] = useState('')
  const [subject, setSubject] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('study_schedule_entries')
      .select('*')
      .order('time_label')
    if (error) {
      setError(error.message)
      return
    }
    setEntries(data)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!subject.trim()) return
    setError('')
    setSaving(true)
    const { error } = await supabase.from('study_schedule_entries').insert({
      weekday: Number(weekday),
      time_label: timeLabel.trim() || null,
      subject: subject.trim(),
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setTimeLabel('')
    setSubject('')
    load()
  }

  async function handleDelete(id) {
    if (!(await confirm('¿Eliminar esta clase del horario?'))) return
    const { error } = await supabase.from('study_schedule_entries').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <form onSubmit={handleAdd} className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-white">
          Día
          <select
            value={weekday}
            onChange={(e) => setWeekday(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          >
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-white">
          Hora (opcional)
          <input
            type="text"
            value={timeLabel}
            onChange={(e) => setTimeLabel(e.target.value)}
            placeholder="9:00-10:00"
            className="w-32 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-white">
          Asignatura
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej. Matemáticas"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          Añadir
        </button>
      </form>

      {entries === null ? (
        <p className="text-sm text-white">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WEEKDAY_LABELS.map((label, i) => {
            const dayEntries = entries.filter((e) => e.weekday === i)
            return (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 shadow-sm">
                <p className="mb-2 text-sm font-medium text-white">{label}</p>
                {dayEntries.length === 0 ? (
                  <p className="text-xs text-white">Sin clases</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {dayEntries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg bg-slate-950/40 px-2.5 py-1.5 text-xs"
                      >
                        <span>
                          {entry.time_label && <span className="text-violet-300">{entry.time_label} · </span>}
                          {entry.subject}
                        </span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-white hover:text-red-400"
                          aria-label="Eliminar"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Horario() {
  const [mode, setMode] = useState('foto')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-500">
          🗓️ Horario
        </h1>
        <div className="flex gap-1">
          {[
            { id: 'foto', label: 'Foto' },
            { id: 'manual', label: 'Manual' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                mode === m.id ? 'bg-violet-500/20 text-violet-300' : 'text-white hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'foto' ? <PhotoSchedule /> : <ManualSchedule />}
    </div>
  )
}
