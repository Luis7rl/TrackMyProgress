-- TrackMyProgress · Estudio: Horario (foto o a mano) y Notas (asignaturas + examenes)
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.

create table if not exists study_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists study_subjects_user_id_idx on study_subjects (user_id);
alter table study_subjects enable row level security;

create policy "study_subjects_select_own" on study_subjects
  for select using (auth.uid() = user_id);
create policy "study_subjects_insert_own" on study_subjects
  for insert with check (auth.uid() = user_id);
create policy "study_subjects_update_own" on study_subjects
  for update using (auth.uid() = user_id);
create policy "study_subjects_delete_own" on study_subjects
  for delete using (auth.uid() = user_id);

create table if not exists study_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references study_subjects (id) on delete cascade,
  label text not null,
  score numeric not null,
  weight_percent numeric,
  created_at timestamptz not null default now()
);
create index if not exists study_grades_subject_id_idx on study_grades (subject_id);
alter table study_grades enable row level security;

create policy "study_grades_select_own" on study_grades
  for select using (auth.uid() = user_id);
create policy "study_grades_insert_own" on study_grades
  for insert with check (auth.uid() = user_id);
create policy "study_grades_update_own" on study_grades
  for update using (auth.uid() = user_id);
create policy "study_grades_delete_own" on study_grades
  for delete using (auth.uid() = user_id);

create table if not exists study_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  time_label text,
  subject text not null,
  created_at timestamptz not null default now()
);
create index if not exists study_schedule_entries_user_id_idx on study_schedule_entries (user_id, weekday);
alter table study_schedule_entries enable row level security;

create policy "study_schedule_entries_select_own" on study_schedule_entries
  for select using (auth.uid() = user_id);
create policy "study_schedule_entries_insert_own" on study_schedule_entries
  for insert with check (auth.uid() = user_id);
create policy "study_schedule_entries_update_own" on study_schedule_entries
  for update using (auth.uid() = user_id);
create policy "study_schedule_entries_delete_own" on study_schedule_entries
  for delete using (auth.uid() = user_id);

-- Horario subido como foto (reutiliza el bucket "progress-photos" ya creado,
-- bajo <user_id>/schedule.jpg — la politica de ese bucket ya autoriza
-- cualquier archivo dentro de la carpeta del propio usuario).
create table if not exists study_schedule_photo (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  photo_path text,
  updated_at timestamptz not null default now()
);
alter table study_schedule_photo enable row level security;

create policy "study_schedule_photo_select_own" on study_schedule_photo
  for select using (auth.uid() = user_id);
create policy "study_schedule_photo_insert_own" on study_schedule_photo
  for insert with check (auth.uid() = user_id);
create policy "study_schedule_photo_update_own" on study_schedule_photo
  for update using (auth.uid() = user_id);
