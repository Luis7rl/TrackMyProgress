-- TrackMyProgress · perfiles (nombre de usuario)
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.

create table if not exists profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Solo lectura/creación del propio perfil. Sin política de update: el
-- nombre de usuario es inmutable una vez creado (a propósito, de cara a
-- perfiles públicos en el futuro).
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = user_id);
