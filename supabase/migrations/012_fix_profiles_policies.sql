-- TrackMyProgress · asegura que las políticas de profiles y
-- user_module_settings existen, aunque una ejecución anterior se haya
-- quedado a medias. Seguro de re-ejecutar.

create table if not exists profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = user_id);

create table if not exists user_module_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  modules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table user_module_settings enable row level security;

drop policy if exists "user_module_settings_select_own" on user_module_settings;
create policy "user_module_settings_select_own" on user_module_settings
  for select using (auth.uid() = user_id);

drop policy if exists "user_module_settings_insert_own" on user_module_settings;
create policy "user_module_settings_insert_own" on user_module_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_module_settings_update_own" on user_module_settings;
create policy "user_module_settings_update_own" on user_module_settings
  for update using (auth.uid() = user_id);
