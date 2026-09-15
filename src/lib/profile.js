import { supabase } from './supabaseClient'

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/

export async function fetchProfile() {
  const { data, error } = await supabase.from('profiles').select('username').maybeSingle()
  if (error) throw error
  return data
}

export async function createProfile(username) {
  const { error } = await supabase.from('profiles').insert({ username })
  if (error) throw error
}
