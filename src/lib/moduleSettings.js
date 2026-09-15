import { supabase } from './supabaseClient'

// group: 'deporte' = sub-pestaña dentro de Deporte, 'top' = pestaña principal.
export const MODULE_INFO = [
  { key: 'gimnasio', label: 'Gimnasio', icon: '🏋️', group: 'deporte' },
  { key: 'carrera', label: 'Carrera', icon: '🏃', group: 'deporte' },
  { key: 'pasos', label: 'Pasos', icon: '👟', group: 'deporte' },
  { key: 'fisico', label: 'Físico', icon: '📸', group: 'deporte' },
  { key: 'dieta', label: 'Dieta', icon: '🍎', group: 'top' },
  { key: 'estudio', label: 'Estudio', icon: '📚', group: 'top' },
  { key: 'calendario', label: 'Calendario', icon: '🗓️', group: 'top' },
]

export const MODULE_KEYS = MODULE_INFO.map((m) => m.key)

export const DEFAULT_MODULES = Object.fromEntries(MODULE_KEYS.map((k) => [k, true]))

export async function fetchModuleSettings() {
  const { data, error } = await supabase.from('user_module_settings').select('modules').maybeSingle()
  if (error) throw error
  return { ...DEFAULT_MODULES, ...(data?.modules ?? {}) }
}

export async function saveModuleSettings(modules) {
  const { error } = await supabase
    .from('user_module_settings')
    .upsert({ modules }, { onConflict: 'user_id' })
  if (error) throw error
}
