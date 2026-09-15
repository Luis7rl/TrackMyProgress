-- TrackMyProgress · secciones visibles por usuario
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.

create table if not exists user_module_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  modules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_module_settings enable row level security;

create policy "user_module_settings_select_own" on user_module_settings
  for select using (auth.uid() = user_id);
create policy "user_module_settings_insert_own" on user_module_settings
  for insert with check (auth.uid() = user_id);
create policy "user_module_settings_update_own" on user_module_settings
  for update using (auth.uid() = user_id);
