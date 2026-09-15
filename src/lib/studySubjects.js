import { supabase } from './supabaseClient'

export async function fetchSubjects() {
  const { data, error } = await supabase.from('study_subjects').select('*').order('name')
  if (error) throw error
  return data
}

export async function createSubject(name) {
  const { data, error } = await supabase.from('study_subjects').insert({ name }).select().single()
  if (error) throw error
  return data
}
