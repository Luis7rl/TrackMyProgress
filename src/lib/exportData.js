import { todayKey } from './dates'
import { supabase } from './supabaseClient'

const EXPORT_TABLES = [
  'workouts',
  'workout_sets',
  'body_weight_logs',
  'step_logs',
  'running_sessions',
  'running_plan_days',
  'diet_logs',
  'study_sessions',
  'study_plan_days',
  'study_subjects',
  'study_grades',
  'study_schedule_entries',
  'calendar_events',
  'user_goals',
]

async function fetchAllRows(table) {
  const pageSize = 1000
  let from = 0
  let all = []
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1)
    if (error) throw error
    all = all.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

export async function exportAllData() {
  const result = {}
  for (const table of EXPORT_TABLES) {
    result[table] = await fetchAllRows(table)
  }
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trackmyprogress-export-${todayKey()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
