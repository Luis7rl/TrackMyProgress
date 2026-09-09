// Estimaciones aproximadas de kcal quemadas por actividad (no incluyen el
// metabolismo basal, solo el gasto extra de pasos + carrera + gimnasio).
export const KCAL_PER_STEP = 0.04
export const GYM_SESSION_KCAL = 300
export const RUNNING_KCAL_PER_KM_PER_KG = 1.0
export const DEFAULT_WEIGHT_KG = 75

export function estimateBurn({ steps = 0, km = 0, gymSessions = 0, weightKg = DEFAULT_WEIGHT_KG }) {
  return Math.round(
    steps * KCAL_PER_STEP + km * weightKg * RUNNING_KCAL_PER_KM_PER_KG + gymSessions * GYM_SESSION_KCAL,
  )
}
