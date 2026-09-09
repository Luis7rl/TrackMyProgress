-- TrackMyProgress · esquema completo (Gimnasio + Peso corporal + Pasos + Carrera + Fotos)
-- Ejecutar en el SQL editor del proyecto de Supabase.
-- Nota: si esta base de datos ya tenía un esquema anterior, ejecuta en su lugar los
-- scripts de supabase/migrations/ en orden (001_hevy_import.sql, 002_body_weight.sql,
-- 003_steps_webhook.sql, 004_running.sql, 005_progress_photos.sql...). El INSERT de la
-- clave del webhook de pasos (ver 003_steps_webhook.sql) hay que ejecutarlo aparte.

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  notes text,
  -- start_time original de Hevy (u otro origen externo), para evitar reimportar duplicados.
  external_ref text,
  created_at timestamptz not null default now()
);

create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  exercise_name text not null,
  set_number int not null,
  -- nullable: una serie de cardio puro no tiene reps/peso.
  reps int,
  weight_kg numeric,
  set_type text default 'normal',
  rpe numeric,
  distance_km numeric,
  duration_seconds int,
  superset_id int,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_id_date_idx on workouts (user_id, date desc);
create index if not exists workout_sets_workout_id_idx on workout_sets (workout_id);
create unique index if not exists workouts_user_external_ref_idx
  on workouts (user_id, external_ref) where external_ref is not null;

alter table workouts enable row level security;
alter table workout_sets enable row level security;

-- Cada usuario solo puede ver/editar sus propios entrenamientos.
create policy "workouts_select_own" on workouts
  for select using (auth.uid() = user_id);
create policy "workouts_insert_own" on workouts
  for insert with check (auth.uid() = user_id);
create policy "workouts_update_own" on workouts
  for update using (auth.uid() = user_id);
create policy "workouts_delete_own" on workouts
  for delete using (auth.uid() = user_id);

-- Las series heredan el acceso a través del entrenamiento al que pertenecen.
create policy "workout_sets_select_own" on workout_sets
  for select using (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  );
create policy "workout_sets_insert_own" on workout_sets
  for insert with check (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  );
create policy "workout_sets_update_own" on workout_sets
  for update using (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  );
create policy "workout_sets_delete_own" on workout_sets
  for delete using (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  );

-- Peso corporal

create table if not exists body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  notes text,
  photo_path text,
  created_at timestamptz not null default now()
);

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

-- Pasos + webhook para Atajos de iPhone

create table if not exists step_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  steps int not null,
  created_at timestamptz not null default now()
);

create unique index if not exists step_logs_user_date_idx
  on step_logs (user_id, date);

alter table step_logs enable row level security;

create policy "step_logs_select_own" on step_logs
  for select using (auth.uid() = user_id);
create policy "step_logs_insert_own" on step_logs
  for insert with check (auth.uid() = user_id);
create policy "step_logs_update_own" on step_logs
  for update using (auth.uid() = user_id);
create policy "step_logs_delete_own" on step_logs
  for delete using (auth.uid() = user_id);

create table if not exists webhook_secrets (
  key text primary key,
  secret text not null
);
alter table webhook_secrets enable row level security;

create or replace function public.log_steps_webhook(p_date date, p_steps int, p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_secret text;
begin
  select secret into v_secret from webhook_secrets where key = 'steps';
  if v_secret is null or p_secret <> v_secret then
    raise exception 'unauthorized';
  end if;

  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise exception 'no user found';
  end if;

  insert into step_logs (user_id, date, steps)
  values (v_user_id, p_date, p_steps)
  on conflict (user_id, date) do update set steps = excluded.steps;
end;
$$;

revoke all on function public.log_steps_webhook(date, int, text) from public;
grant execute on function public.log_steps_webhook(date, int, text) to anon;

-- Carrera

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

-- Fotos de progreso (Storage)

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "progress_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "progress_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "progress_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "progress_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
