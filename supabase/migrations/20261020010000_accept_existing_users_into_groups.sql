-- Allow an existing account to accept an administrator invite without creating a duplicate auth user.
create or replace function public.accept_admin_group_invite(
  p_token uuid,
  p_group_name text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_invite public.admin_group_invites%rowtype;
  v_group_id uuid;
  v_alias text := trim(coalesce(p_display_name, ''));
  v_group_name text := trim(coalesce(p_group_name, ''));
  v_slug_base text;
  v_slug text;
  v_invite_code text;
begin
  if v_user_id is null then
    raise exception 'Tenés que ingresar con tu cuenta antes de aceptar la invitación';
  end if;

  if char_length(v_group_name) < 2 or char_length(v_group_name) > 40 then
    raise exception 'El nombre del grupo debe tener entre 2 y 40 caracteres';
  end if;

  if char_length(v_alias) < 2 or char_length(v_alias) > 60 then
    raise exception 'El alias debe tener entre 2 y 60 caracteres';
  end if;

  select * into v_invite
  from public.admin_group_invites i
  where i.token = p_token
    and i.used_at is null
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'La invitación de administrador venció o ya fue utilizada';
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(v_group_name), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'grupo';
  end if;
  v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.groups (name, slug, created_by, invite_code)
  values (v_group_name, v_slug, v_user_id, v_invite_code)
  returning id into v_group_id;

  insert into public.seasons (group_id, name, status)
  values (v_group_id, 'Temporada ' || extract(year from now())::integer::text, 'activa');

  insert into public.items (group_id, key, label, selection_type, points, active, sort_order)
  select v_group_id, i.key, i.label, i.selection_type, i.points, i.active, i.sort_order
  from public.items i
  where i.group_id = v_invite.source_group_id;

  insert into public.group_members (group_id, user_id, display_name, role, status)
  values (v_group_id, v_user_id, v_alias, 'admin', 'activo');

  update public.admin_group_invites
  set used_at = now()
  where token = p_token;

  return v_group_id;
end;
$function$;

revoke all on function public.accept_admin_group_invite(uuid, text, text) from public, anon;
grant execute on function public.accept_admin_group_invite(uuid, text, text) to authenticated;

-- Allow an existing account to request membership in another group using its public join link.
create or replace function public.accept_group_invite_for_existing_user(
  p_group_id uuid,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_alias text := trim(coalesce(p_display_name, ''));
  v_member_id uuid;
begin
  if v_user_id is null then
    raise exception 'Tenés que ingresar con tu cuenta antes de pedir acceso al grupo';
  end if;

  if char_length(v_alias) < 2 or char_length(v_alias) > 30 then
    raise exception 'El alias debe tener entre 2 y 30 caracteres';
  end if;

  if not exists (select 1 from public.groups g where g.id = p_group_id) then
    raise exception 'No se encontró el grupo';
  end if;

  if exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = v_user_id
  ) then
    raise exception 'Tu cuenta ya tiene una membresía en este grupo';
  end if;

  if exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id
      and lower(gm.display_name) = lower(v_alias)
      and gm.status <> 'baja'
  ) then
    raise exception 'Ese alias ya está en uso. Probá otro';
  end if;

  insert into public.profiles (id, display_name)
  values (v_user_id, v_alias)
  on conflict (id) do nothing;

  insert into public.group_members (group_id, user_id, display_name, role, status)
  values (p_group_id, v_user_id, v_alias, 'miembro', 'pendiente')
  returning id into v_member_id;

  return v_member_id;
end;
$function$;

revoke all on function public.accept_group_invite_for_existing_user(uuid, text) from public, anon;
grant execute on function public.accept_group_invite_for_existing_user(uuid, text) to authenticated;
