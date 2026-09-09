import { supabase } from './supabaseClient'

export const DEFAULT_GOALS = {
  target_weight_kg: 75,
  target_daily_steps: 10000,
  target_weekly_km: 7,
}

export async function fetchGoals() {
  const { data, error } = await supabase.from('user_goals').select('*').maybeSingle()
  if (error) throw error
  return { ...DEFAULT_GOALS, ...data }
}

export async function saveGoal(field, value) {
  const { error } = await supabase.from('user_goals').upsert({ [field]: value }, { onConflict: 'user_id' })
  if (error) throw error
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, value))
}
