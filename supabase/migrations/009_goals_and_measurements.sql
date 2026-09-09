-- TrackMyProgress · objetivos + medidas corporales
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.

create table if not exists user_goals (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  target_weight_kg numeric,
  target_daily_steps int,
  target_weekly_km numeric,
  updated_at timestamptz not null default now()
);

alter table user_goals enable row level security;

create policy "user_goals_select_own" on user_goals
  for select using (auth.uid() = user_id);
create policy "user_goals_insert_own" on user_goals
  for insert with check (auth.uid() = user_id);
create policy "user_goals_update_own" on user_goals
  for update using (auth.uid() = user_id);
create policy "user_goals_delete_own" on user_goals
  for delete using (auth.uid() = user_id);

alter table body_weight_logs
  add column if not exists waist_cm numeric,
  add column if not exists arm_cm numeric,
  add column if not exists chest_cm numeric;
