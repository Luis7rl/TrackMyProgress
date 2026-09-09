-- TrackMyProgress · módulo de Carrera
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.

create table if not exists running_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  distance_km numeric not null,
  duration_seconds int not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists running_sessions_user_date_idx
  on running_sessions (user_id, date desc);

alter table running_sessions enable row level security;

create policy "running_sessions_select_own" on running_sessions
  for select using (auth.uid() = user_id);
create policy "running_sessions_insert_own" on running_sessions
  for insert with check (auth.uid() = user_id);
create policy "running_sessions_update_own" on running_sessions
  for update using (auth.uid() = user_id);
create policy "running_sessions_delete_own" on running_sessions
  for delete using (auth.uid() = user_id);

-- Plan semanal: una fila por día de la semana (0 = lunes ... 6 = domingo).
create table if not exists running_plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  description text,
  created_at timestamptz not null default now()
);

create unique index if not exists running_plan_days_user_weekday_idx
  on running_plan_days (user_id, weekday);

alter table running_plan_days enable row level security;

create policy "running_plan_days_select_own" on running_plan_days
  for select using (auth.uid() = user_id);
create policy "running_plan_days_insert_own" on running_plan_days
  for insert with check (auth.uid() = user_id);
create policy "running_plan_days_update_own" on running_plan_days
  for update using (auth.uid() = user_id);
create policy "running_plan_days_delete_own" on running_plan_days
  for delete using (auth.uid() = user_id);
