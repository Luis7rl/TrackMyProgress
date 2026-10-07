import { supabase } from './supabaseClient'

// Reglas de puntos: ajustables a ojo, no hay ciencia detrás.
export const POINTS = {
  perWorkout: 30, // por día de gimnasio entrenado
  perKmRun: 5, // por km corrido
  per1000Steps: 2, // por cada 1000 pasos
  perStudyHour: 10, // por hora de estudio
  perDietDayUnderTarget: 15, // por día con calorías consumidas por debajo del objetivo
}

export const TARGET_CALORIES = 2200

// Lista fija de recompensas disponibles (se cambian aquí, no desde la app).
export const REWARDS = [
  { id: 'dulce', icon: '🍬', name: 'Dulce', cost: 60 },
  { id: 'helado', icon: '🍦', name: 'Helado', cost: 80 },
  { id: 'bebida', icon: '🥤', name: 'Refresco o cerveza', cost: 80 },
  { id: 'series', icon: '🛋️', name: 'Noche de series y manta', cost: 100 },
  { id: 'dormir', icon: '😴', name: 'Dormir hasta tarde', cost: 120 },
  { id: 'cheat', icon: '🍔', name: 'Cheat meal', cost: 250 },
  { id: 'copas', icon: '🍻', name: 'Salida de copas', cost: 300 },
  { id: 'diasin', icon: '🍕', name: 'Día entero sin contar calorías', cost: 500 },
]

export async function fetchPointsSummary() {
  const [
    { data: workouts, error: wErr },
    { data: running, error: rErr },
    { data: steps, error: sErr },
    { data: study, error: stErr },
    { data: diet, error: dErr },
    { data: redemptions, error: redErr },
  ] = await Promise.all([
    supabase.from('workouts').select('id'),
    supabase.from('running_sessions').select('distance_km'),
    supabase.from('step_logs').select('steps'),
    supabase.from('study_sessions').select('duration_minutes'),
    supabase.from('diet_logs').select('calories'),
    supabase.from('reward_redemptions').select('points_spent'),
  ])

  const error = wErr || rErr || sErr || stErr || dErr || redErr
  if (error) throw error

  const totalKm = running.reduce((sum, r) => sum + Number(r.distance_km), 0)
  const totalSteps = steps.reduce((sum, s) => sum + s.steps, 0)
  const totalStudyHours = study.reduce((sum, s) => sum + s.duration_minutes, 0) / 60
  const dietDaysUnderTarget = diet.filter((d) => d.calories < TARGET_CALORIES).length

  const breakdown = {
    workouts: { count: workouts.length, points: Math.round(workouts.length * POINTS.perWorkout) },
    running: { km: totalKm, points: Math.round(totalKm * POINTS.perKmRun) },
    steps: { total: totalSteps, points: Math.round((totalSteps / 1000) * POINTS.per1000Steps) },
    study: { hours: totalStudyHours, points: Math.round(totalStudyHours * POINTS.perStudyHour) },
    diet: { days: dietDaysUnderTarget, points: dietDaysUnderTarget * POINTS.perDietDayUnderTarget },
  }

  const earned = Object.values(breakdown).reduce((sum, b) => sum + b.points, 0)
  const spent = redemptions.reduce((sum, r) => sum + r.points_spent, 0)

  return { breakdown, earned, spent, balance: earned - spent }
}

export async function fetchRedemptions() {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('*')
    .order('redeemed_at', { ascending: false })
  if (error) throw error
  return data
}

export async function redeemReward(name, pointCost) {
  const { error } = await supabase
    .from('reward_redemptions')
    .insert({ reward_name: name, points_spent: pointCost })
  if (error) throw error
}
