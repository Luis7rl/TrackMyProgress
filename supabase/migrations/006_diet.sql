-- TrackMyProgress · módulo de Dieta
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.

create table if not exists diet_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  calories int not null,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists diet_logs_user_date_idx
  on diet_logs (user_id, date);

alter table diet_logs enable row level security;

create policy "diet_logs_select_own" on diet_logs
  for select using (auth.uid() = user_id);
create policy "diet_logs_insert_own" on diet_logs
  for insert with check (auth.uid() = user_id);
create policy "diet_logs_update_own" on diet_logs
  for update using (auth.uid() = user_id);
create policy "diet_logs_delete_own" on diet_logs
  for delete using (auth.uid() = user_id);
