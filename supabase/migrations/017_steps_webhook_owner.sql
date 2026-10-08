-- TrackMyProgress · los pasos del Atajo se guardan siempre en la cuenta del dueño
-- Antes la función cogía "el primer usuario" de auth.users; con más de una cuenta en la
-- app podía guardarlos en otra. Ahora busca la cuenta por email (la de src/lib/adminUser.js).

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

  select id into v_user_id from auth.users where lower(email) = 'luisherrero1bcsa@gmail.com';
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
