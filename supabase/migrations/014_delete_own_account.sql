-- TrackMyProgress · borrar la propia cuenta
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.
--
-- Un cliente normal no tiene permiso para borrar filas de auth.users (hace
-- falta la service_role key, que nunca debe exponerse en el navegador). Esta
-- funcion "security definer" corre con privilegios elevados pero solo deja
-- borrar la propia cuenta (auth.uid()), nunca la de otra persona. Todas las
-- tablas de la app referencian auth.users con "on delete cascade", asi que
-- borrar la fila de auth.users arrastra automaticamente todos sus datos
-- (entrenamientos, pasos, dieta, estudio, objetivos, perfil, ajustes...).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
