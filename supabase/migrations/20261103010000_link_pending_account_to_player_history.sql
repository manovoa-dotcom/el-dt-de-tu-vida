create or replace function public.vincular_cuenta_con_historial(
  p_group_id uuid,
  p_member_id uuid,
  p_pending_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_group_id uuid;
  v_user_id uuid;
  v_member_name text;
  v_member_status text;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  select gm.group_id
  into v_group_id
  from public.group_members gm
  where gm.user_id = auth.uid()
    and gm.group_id = p_group_id
    and gm.role = 'admin'
    and gm.status = 'activo'
  limit 1;

  if v_group_id is null or p_group_id is null then
    raise exception 'No tenés permisos de admin';
  end if;

  if p_member_id = p_pending_member_id then
    raise exception 'Elegí dos miembros diferentes';
  end if;

  select gm.display_name, gm.status
  into v_member_name, v_member_status
  from public.group_members gm
  where gm.id = p_member_id
    and gm.group_id = v_group_id
    and (
      gm.status = 'baja'
      or (gm.status = 'invitado' and gm.user_id is null)
    )
  for update;

  if not found then
    raise exception 'No se encontró el invitado o jugador archivado';
  end if;

  select gm.user_id
  into v_user_id
  from public.group_members gm
  where gm.id = p_pending_member_id
    and gm.group_id = v_group_id
    and gm.status = 'pendiente'
  for update;

  if not found or v_user_id is null then
    raise exception 'La solicitud seleccionada ya no está pendiente';
  end if;

  if exists (
    select 1
    from public.group_members gm
    where gm.group_id = v_group_id
      and gm.user_id = v_user_id
      and gm.id <> p_pending_member_id
  ) then
    raise exception 'Esta cuenta ya está vinculada a otro miembro del grupo';
  end if;

  if exists (select 1 from public.attendance a where a.member_id = p_pending_member_id)
    or exists (select 1 from public.player_scores ps where ps.member_id = p_pending_member_id)
    or exists (select 1 from public.match_item_wins w where w.member_id = p_pending_member_id)
    or exists (select 1 from public.cards c where c.member_id = p_pending_member_id)
    or exists (select 1 from public.market_values mv where mv.member_id = p_pending_member_id)
    or exists (select 1 from public.fantasy_picks fp where fp.member_id = p_pending_member_id)
    or exists (select 1 from public.fantasy_teams ft where ft.dt_member_id = p_pending_member_id)
    or exists (select 1 from public.dt_scores ds where ds.dt_member_id = p_pending_member_id)
    or exists (
      select 1
      from public.elections e
      where e.ganador_titular_id = p_pending_member_id
        or e.ganador_suplente_id = p_pending_member_id
    )
    or exists (
      select 1
      from public.election_votes ev
      where ev.voter_member_id = p_pending_member_id
    )
  then
    raise exception 'La solicitud pendiente ya tiene historial y no se puede fusionar sin perder datos';
  end if;

  update public.group_members
  set user_id = null,
      status = 'baja',
      left_at = coalesce(left_at, now())
  where id = p_pending_member_id
    and group_id = v_group_id;

  delete from public.group_members
  where id = p_pending_member_id
    and group_id = v_group_id;

  update public.group_members
  set user_id = v_user_id,
      status = 'activo',
      left_at = null
  where id = p_member_id
    and group_id = v_group_id;

  insert into public.corrections (
    group_id,
    entity,
    entity_id,
    description,
    before_data
  )
  values (
    v_group_id,
    'otro',
    p_member_id,
    format('Se vinculó una cuenta nueva con el historial de %s', v_member_name),
    jsonb_build_object(
      'previous_status', v_member_status,
      'linked_user_id', v_user_id
    )
  );
end;
$function$;

revoke all on function public.vincular_cuenta_con_historial(uuid, uuid, uuid)
from public, anon;
grant execute on function public.vincular_cuenta_con_historial(uuid, uuid, uuid)
to authenticated;
