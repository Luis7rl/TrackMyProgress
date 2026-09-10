import Papa from 'papaparse'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const LBS_TO_KG = 0.453592
const MILES_TO_KM = 1.60934

const MONTHS_ES = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
}

// Soporta el formato ISO habitual de Hevy ("2026-09-10 10:58:00") y también
// un formato local tipo "10 sep 2026, 10:58" (sin cero delante en días de
// un dígito) que puede aparecer si el CSV se abrió/guardó con Excel/Numbers.
// Nunca recortar por posición de caracteres: con días de 1 y 2 dígitos la
// longitud del string cambia y un slice(0, N) fijo desplaza el año.
function parseHevyDate(startTime) {
  if (!startTime) return null

  const iso = startTime.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const es = startTime.match(/^(\d{1,2})\s+([a-zñ]{3,4})\.?\s+(\d{4})/i)
  if (es) {
    const month = MONTHS_ES[es[2].toLowerCase().slice(0, 3)]
    if (month) return `${es[3]}-${month}-${es[1].padStart(2, '0')}`
  }

  return null
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function groupByWorkout(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = `${row.title ?? ''}|${row.start_time ?? ''}`
    if (!row.start_time) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return groups
}

function buildWorkoutPayload(rows) {
  const first = rows[0]
  const date = parseHevyDate(first.start_time)
  const notes = [first.title, first.description].filter(Boolean).join(' — ') || null

  const setCounters = new Map()
  const sets = []
  let skipped = 0

  rows.forEach((row) => {
    const exerciseName = (row.exercise_title || '').trim()
    if (!exerciseName) {
      skipped += 1
      return
    }

    const weightKg =
      toNumberOrNull(row.weight_kg) ??
      (toNumberOrNull(row.weight_lbs) !== null
        ? Math.round(toNumberOrNull(row.weight_lbs) * LBS_TO_KG * 100) / 100
        : null)

    const distanceKm =
      toNumberOrNull(row.distance_km) ??
      (toNumberOrNull(row.distance_miles) !== null
        ? Math.round(toNumberOrNull(row.distance_miles) * MILES_TO_KM * 100) / 100
        : null)

    const setNumber = (setCounters.get(exerciseName) ?? 0) + 1
    setCounters.set(exerciseName, setNumber)

    sets.push({
      exercise_name: exerciseName,
      set_number: setNumber,
      reps: row.reps !== undefined ? parseInt(row.reps, 10) || null : null,
      weight_kg: weightKg,
      set_type: row.set_type || 'normal',
      rpe: toNumberOrNull(row.rpe),
      distance_km: distanceKm,
      duration_seconds: row.duration_seconds ? parseInt(row.duration_seconds, 10) || null : null,
      order_index: sets.length,
    })
  })

  return {
    workout: { date, notes, external_ref: first.start_time },
    sets,
    skipped,
  }
}

export default function ImportHevy() {
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError('')
    setSummary(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => runImport(results.data),
      error: (err) => setError(err.message),
    })
  }

  async function runImport(rows) {
    const groups = groupByWorkout(rows)
    const total = groups.size

    if (total === 0) {
      setError('No se han encontrado entrenamientos en el CSV.')
      return
    }

    setImporting(true)

    let imported = 0
    let alreadyImported = 0
    let skippedSets = 0
    const errors = []

    let i = 0
    for (const rows of groups.values()) {
      i += 1
      setProgress({ current: i, total })

      const { workout, sets, skipped } = buildWorkoutPayload(rows)
      skippedSets += skipped

      if (!workout.date) {
        errors.push(`Fecha no reconocida: "${workout.external_ref}"`)
        continue
      }

      try {
        const { data: existing, error: existingError } = await supabase
          .from('workouts')
          .select('id')
          .eq('external_ref', workout.external_ref)
          .maybeSingle()

        if (existingError) throw existingError

        if (existing) {
          alreadyImported += 1
          continue
        }

        if (sets.length === 0) continue

        const { data: created, error: workoutError } = await supabase
          .from('workouts')
          .insert(workout)
          .select()
          .single()

        if (workoutError) throw workoutError

        const { error: setsError } = await supabase
          .from('workout_sets')
          .insert(sets.map((s) => ({ ...s, workout_id: created.id })))

        if (setsError) throw setsError

        imported += 1
      } catch (err) {
        errors.push(`${workout.date} — ${err.message}`)
      }
    }

    setImporting(false)
    setProgress(null)
    setSummary({ imported, alreadyImported, skippedSets, errors })
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Importar desde Hevy</h1>
      <p className="mb-6 text-sm text-slate-600">
        Exporta tu historial desde Hevy (Perfil → Configuración → Exportar e importar datos →
        Exportar entrenamientos) y sube aquí el archivo CSV.
      </p>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center hover:border-slate-500">
        <span className="text-sm text-slate-700">
          {fileName || 'Toca para seleccionar el CSV'}
        </span>
        <input type="file" accept=".csv" onChange={handleFile} className="hidden" disabled={importing} />
      </label>

      {importing && progress && (
        <p className="mt-4 text-sm text-slate-600">
          Importando entrenamiento {progress.current} de {progress.total}…
        </p>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {summary && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="mb-1">✅ {summary.imported} entrenamientos importados</p>
          {summary.alreadyImported > 0 && (
            <p className="mb-1 text-slate-600">
              ⏭ {summary.alreadyImported} ya estaban importados (omitidos)
            </p>
          )}
          {summary.skippedSets > 0 && (
            <p className="mb-1 text-slate-600">
              ⚠ {summary.skippedSets} series omitidas (sin ejercicio)
            </p>
          )}
          {summary.errors.length > 0 && (
            <div className="mt-3 text-red-600">
              <p className="mb-1">{summary.errors.length} entrenamientos con error:</p>
              <ul className="list-disc pl-5">
                {summary.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
