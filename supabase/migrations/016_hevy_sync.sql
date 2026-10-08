-- TrackMyProgress · sincronización automática con la API de Hevy
-- Ejecutar en el SQL editor de Supabase. La función api/hevy-sync.js (Vercel) guarda aquí
-- hasta cuándo ha sincronizado, para pedir a Hevy solo los cambios posteriores.

create table if not exists hevy_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_synced_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table hevy_sync_state enable row level security;

-- Solo lectura desde la app (para mostrar la última sincronización). Escribe la función
-- del servidor con la clave de servicio, que no pasa por RLS.
create policy "hevy_sync_state_select_own" on hevy_sync_state
  for select using (auth.uid() = user_id);
