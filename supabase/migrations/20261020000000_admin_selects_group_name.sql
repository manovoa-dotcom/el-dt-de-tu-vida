-- Let the invited administrator choose the group's name during registration.
-- Existing invitations keep working because the trigger falls back to their saved name.

alter table public.admin_group_invites
  alter column group_name drop not null;

create or replace function public.create_admin_group_invite(p_group_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_token uuid;
  v_legacy_name text := nullif(trim(coalesce(p_group_name, '')), '');
  v_items_count integer;
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'manovoa@gmail.com' then
    raise exception 'No tenés permiso para crear invitaciones de administrador';
  end if;

  if v_user_id is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  -- A name is optional for new links. Validate it only for older application versions.
  if v_legacy_name is not null and (char_length(v_legacy_name) < 2 or char_length(v_legacy_name) > 40) then
    raise exception 'El nombre del grupo debe tener entre 2 y 40 caracteres';
  end if;

  select gm.group_id
  into v_group_id
  from public.group_members gm
  where gm.user_id = v_user_id
    and gm.role = 'admin'
    and gm.status = 'activo'
  order by gm.joined_at asc
  limit 1;

  if v_group_id is null then
    raise exception 'No se encontró tu grupo administrador para copiar la configuración inicial';
  end if;

  select count(*) into v_items_count
  from public.items i
  where i.group_id = v_group_id;

  if v_items_count < 4 then
    raise exception 'El grupo de referencia necesita al menos cuatro ítems configurados';
  end if;

  insert into public.admin_group_invites (group_name, source_group_id, created_by)
  values (v_legacy_name, v_group_id, v_user_id)
  returning token into v_token;

  return v_token;
end;
$function$;

create or replace function public.create_admin_group_from_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_token uuid;
  v_invite public.admin_group_invites%rowtype;
  v_group_id uuid;
  v_alias text;
  v_real_name text;
  v_group_name text;
  v_slug_base text;
  v_slug text;
  v_invite_code text;
begin
  if coalesce(new.raw_user_meta_data ->> 'admin_group_token', '') = '' then
    return new;
  end if;

  v_token := (new.raw_user_meta_data ->> 'admin_group_token')::uuid;

  select * into v_invite
  from public.admin_group_invites i
  where i.token = v_token
    and i.used_at is null
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'La invitación de administrador venció o ya fue utilizada';
  end if;

  v_alias := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  v_real_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'real_name', '')), '');
  -- New links use the name entered by the administrator. Existing links retain their original name.
  v_group_name := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'admin_group_name', '')), ''),
    v_invite.group_name
  );

  if char_length(v_alias) < 2 or new.email is null then
    raise exception 'Falta el email o el alias para crear la cuenta administradora';
  end if;

  if v_group_name is null or char_length(v_group_name) < 2 or char_length(v_group_name) > 40 then
    raise exception 'El nombre del grupo debe tener entre 2 y 40 caracteres';
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(v_group_name), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'grupo';
  end if;
  v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.groups (name, slug, created_by, invite_code)
  values (v_group_name, v_slug, new.id, v_invite_code)
  returning id into v_group_id;

  insert into public.seasons (group_id, name, status)
  values (v_group_id, 'Temporada ' || extract(year from now())::integer::text, 'activa');

  insert into public.items (group_id, key, label, selection_type, points, active, sort_order)
  select v_group_id, i.key, i.label, i.selection_type, i.points, i.active, i.sort_order
  from public.items i
  where i.group_id = v_invite.source_group_id;

  insert into public.profiles (id, display_name, real_name)
  values (new.id, v_alias, v_real_name)
  on conflict (id) do nothing;

  insert into public.group_members (group_id, user_id, display_name, role, status)
  values (v_group_id, new.id, v_alias, 'admin', 'activo');

  update public.admin_group_invites
  set used_at = now()
  where token = v_token;

  return new;
end;
$function$;

revoke all on function public.create_admin_group_from_invite() from public, anon, authenticated;
