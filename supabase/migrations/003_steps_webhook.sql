-- TrackMyProgress · módulo de Pasos + webhook para Atajos de iPhone
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.
-- Después de ejecutar esto, guarda tu clave secreta con el INSERT que se indica al final
-- (no la subas nunca a git ni la compartas).

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

-- Tabla privada para la clave del webhook. RLS activado y sin políticas: nadie puede
-- leerla vía la API pública. Solo la función de abajo (security definer) la consulta.
create table if not exists webhook_secrets (
  key text primary key,
  secret text not null
);
alter table webhook_secrets enable row level security;

-- Función que llama el Atajo de iPhone. Válida la clave secreta y guarda/actualiza los
-- pasos del día para el único usuario de esta app (proyecto personal, un solo usuario).
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

-- Ejecuta esto por separado, sustituyendo <TU_SECRETO>, y no lo compartas ni lo commitees:
-- insert into webhook_secrets (key, secret) values ('steps', '<TU_SECRETO>');
