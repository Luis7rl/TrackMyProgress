import { supabase } from './supabaseClient'

export async function deleteOwnAccount() {
  const { error } = await supabase.rpc('delete_own_account')
  if (error) throw error
}
