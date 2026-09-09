-- TrackMyProgress · fotos de progreso en Físico
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.

alter table body_weight_logs
  add column if not exists photo_path text;

-- Bucket privado para las fotos de progreso.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Cada usuario solo puede ver/subir/borrar sus propios archivos, guardados bajo
-- una carpeta con su user_id: progress-photos/<user_id>/<archivo>.
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
