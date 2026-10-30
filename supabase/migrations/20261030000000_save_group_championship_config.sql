create or replace function public.guardar_config_valores_campeonato(
  p_group_id uuid,
  p_name text,
  p_presentismo_value integer,
  p_dt_pick_value integer,
  p_equipo_ideal_value integer,
  p_equipo_ideal_anio_size integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'admin'
      and gm.status = 'activo'
  ) then
    raise exception 'No tenés permisos para modificar este grupo';
  end if;

  if p_name is null
    or p_presentismo_value is null
    or p_dt_pick_value is null
    or p_equipo_ideal_value is null
    or p_equipo_ideal_anio_size is null
    or char_length(trim(coalesce(p_name, ''))) < 2
    or char_length(trim(p_name)) > 40
    or p_presentismo_value < 0
    or p_dt_pick_value < 0
    or p_equipo_ideal_value < 0
    or p_equipo_ideal_anio_size < 5
    or p_equipo_ideal_anio_size > 11
  then
    raise exception 'La configuración del grupo no es válida';
  end if;

  update public.groups
  set name = trim(p_name),
      presentismo_value = p_presentismo_value,
      dt_pick_value = p_dt_pick_value,
      equipo_ideal_value = p_equipo_ideal_value,
      equipo_ideal_anio_size = p_equipo_ideal_anio_size
  where id = p_group_id;

  if not found then
    raise exception 'No se encontró el grupo';
  end if;

  return true;
end;
$function$;

revoke all on function public.guardar_config_valores_campeonato(
  uuid, text, integer, integer, integer, integer
) from public, anon;
grant execute on function public.guardar_config_valores_campeonato(
  uuid, text, integer, integer, integer, integer
) to authenticated;
