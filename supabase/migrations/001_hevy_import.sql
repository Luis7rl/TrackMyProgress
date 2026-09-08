-- TrackMyProgress · soporte para importar historial de Hevy
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base (schema.sql) aplicado.

alter table workout_sets
  alter column reps drop not null,
  alter column weight_kg drop not null,
  add column if not exists set_type text default 'normal',
  add column if not exists rpe numeric,
  add column if not exists distance_km numeric,
  add column if not exists duration_seconds int,
  add column if not exists superset_id int;

alter table workouts
  add column if not exists external_ref text;

-- Permite volver a importar el mismo CSV sin duplicar entrenamientos ya importados.
create unique index if not exists workouts_user_external_ref_idx
  on workouts (user_id, external_ref) where external_ref is not null;
