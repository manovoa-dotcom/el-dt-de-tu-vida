create or replace function public.actualizar_alias_perfil(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_display_name text := btrim(coalesce(p_display_name, ''));
begin
  if v_user_id is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  if char_length(v_display_name) < 2 then
    raise exception 'El alias debe tener al menos 2 caracteres';
  end if;

  if exists (
    select 1
    from public.group_members current_member
    join public.group_members other_member
      on other_member.group_id = current_member.group_id
     and other_member.user_id is distinct from v_user_id
     and other_member.status <> 'baja'
     and lower(btrim(other_member.display_name)) = lower(v_display_name)
    where current_member.user_id = v_user_id
      and current_member.status <> 'baja'
  ) then
    raise exception 'Ese alias ya está en uso en uno de tus grupos';
  end if;

  insert into public.profiles (id, display_name)
  values (v_user_id, v_display_name)
  on conflict (id) do update
    set display_name = excluded.display_name;

  update public.group_members
  set display_name = v_display_name
  where user_id = v_user_id;
end;
$function$;

revoke all on function public.actualizar_alias_perfil(text)
from public, anon;
grant execute on function public.actualizar_alias_perfil(text)
to authenticated;
