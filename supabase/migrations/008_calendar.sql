-- TrackMyProgress · módulo de Calendario
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  title text not null,
  type text not null default 'tarea' check (type in ('tarea', 'entrenamiento', 'plan')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists calendar_events_user_date_idx
  on calendar_events (user_id, date);

alter table calendar_events enable row level security;

create policy "calendar_events_select_own" on calendar_events
  for select using (auth.uid() = user_id);
create policy "calendar_events_insert_own" on calendar_events
  for insert with check (auth.uid() = user_id);
create policy "calendar_events_update_own" on calendar_events
  for update using (auth.uid() = user_id);
create policy "calendar_events_delete_own" on calendar_events
  for delete using (auth.uid() = user_id);
