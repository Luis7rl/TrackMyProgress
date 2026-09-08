-- TrackMyProgress · esquema completo (Gimnasio + Peso corporal)
-- Ejecutar en el SQL editor del proyecto de Supabase.
-- Nota: si esta base de datos ya tenía un esquema anterior, ejecuta en su lugar los
-- scripts de supabase/migrations/ en orden (001_hevy_import.sql, 002_body_weight.sql...).

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
