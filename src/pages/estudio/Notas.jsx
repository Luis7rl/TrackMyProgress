import { useEffect, useState } from 'react'
import { useConfirm } from '../../context/ConfirmContext'
import { supabase } from '../../lib/supabaseClient'
import { createSubject, fetchSubjects } from '../../lib/studySubjects'

function weightedAverage(grades) {
  if (grades.length === 0) return null
  const withWeight = grades.filter((g) => g.weight_percent != null)
  if (withWeight.length === 0) {
    const sum = grades.reduce((acc, g) => acc + g.score, 0)
    return sum / grades.length
  }
  const totalWeight = withWeight.reduce((acc, g) => acc + g.weight_percent, 0)
  if (totalWeight === 0) return null
  const weightedSum = withWeight.reduce((acc, g) => acc + g.score * g.weight_percent, 0)
  return weightedSum / totalWeight
}

function SubjectCard({ subject, grades, onChanged }) {
  const confirm = useConfirm()
  const [expanded, setExpanded] = useState(false)
  const [label, setLabel] = useState('')
  const [score, setScore] = useState('')
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const avg = weightedAverage(grades)

  async function handleAddGrade(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const { error } = await supabase.from('study_grades').insert({
      subject_id: subject.id,
      label: label.trim(),
      score: Number(score),
      weight_percent: weight ? Number(weight) : null,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setLabel('')
    setScore('')
    setWeight('')
    onChanged()
  }

  async function handleDeleteGrade(id) {
    if (!(await confirm('¿Eliminar este examen/trabajo?'))) return
    const { error } = await supabase.from('study_grades').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    onChanged()
  }

  async function handleDeleteSubject() {
    if (!(await confirm(`¿Eliminar "${subject.name}" y todos sus exámenes?`))) return
    const { error } = await supabase.from('study_subjects').delete().eq('id', subject.id)
    if (error) {
      setError(error.message)
      return
    }
    onChanged()
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-medium">{subject.name}</span>
        <span className="flex items-center gap-3 text-sm">
          {avg != null && (
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
              Nota estimada: {avg.toFixed(2)}
            </span>
          )}
          <span className="text-white">{expanded ? '▲' : '▼'}</span>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 px-4 py-3">
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          {grades.length === 0 ? (
            <p className="mb-3 text-sm text-white">Todavía no hay exámenes ni trabajos.</p>
          ) : (
            <ul className="mb-3 flex flex-col gap-2">
              {grades.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                >
                  <span>{g.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{g.score}</span>
                    {g.weight_percent != null && (
                      <span className="text-white">{g.weight_percent}%</span>
                    )}
                    <button
                      onClick={() => handleDeleteGrade(g.id)}
                      className="text-white hover:text-red-400"
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddGrade} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-white">
              Examen o trabajo
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej. Parcial 1"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white">
              Nota
              <input
                type="number"
                required
                step="0.01"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="7.5"
                className="w-20 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white">
              % nota final
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="30"
                className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-violet-600 shadow-sm shadow-violet-600/20 transition-colors px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              Añadir
            </button>
          </form>

          <button
            onClick={handleDeleteSubject}
            className="mt-4 text-xs text-white hover:text-red-400"
          >
            Eliminar asignatura
          </button>
        </div>
      )}
    </div>
  )
}

export default function Notas() {
  const [subjects, setSubjects] = useState(null)
  const [grades, setGrades] = useState([])
  const [newSubject, setNewSubject] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [subjectsData, { data: gradesData, error: gradesError }] = await Promise.all([
        fetchSubjects(),
        supabase.from('study_grades').select('*'),
      ])
      if (gradesError) throw gradesError
      setSubjects(subjectsData)
      setGrades(gradesData)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAddSubject(e) {
    e.preventDefault()
    setError('')
    if (!newSubject.trim()) return
    setSaving(true)
    try {
      await createSubject(newSubject.trim())
      setNewSubject('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-500">
        📝 Notas
      </h1>

      <form onSubmit={handleAddSubject} className="mb-6 flex items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-white">
          Nueva asignatura
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Ej. Matemáticas"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-shadow focus:border-violet-500 focus:ring-4 focus:ring-violet-500/30"
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

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {subjects === null ? (
        <p className="text-sm text-white">Cargando...</p>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-white">Todavía no has añadido ninguna asignatura.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              grades={grades.filter((g) => g.subject_id === s.id)}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}
