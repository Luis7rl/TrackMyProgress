-- TrackMyProgress · módulo de Peso corporal
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.

create table if not exists body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Un único registro de peso por día y usuario (volver a guardar el mismo día actualiza el valor).
create unique index if not exists body_weight_logs_user_date_idx
  on body_weight_logs (user_id, date);

alter table body_weight_logs enable row level security;

create policy "body_weight_logs_select_own" on body_weight_logs
  for select using (auth.uid() = user_id);
create policy "body_weight_logs_insert_own" on body_weight_logs
  for insert with check (auth.uid() = user_id);
create policy "body_weight_logs_update_own" on body_weight_logs
  for update using (auth.uid() = user_id);
create policy "body_weight_logs_delete_own" on body_weight_logs
  for delete using (auth.uid() = user_id);
