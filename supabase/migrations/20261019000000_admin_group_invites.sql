-- One-time invitations for creating a new, independent group with its first admin.
-- Run this migration in Supabase before deploying the application changes.

create table if not exists public.admin_group_invites (
  token uuid primary key default gen_random_uuid(),
  group_name text not null,
  source_group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz
);

alter table public.admin_group_invites enable row level security;
revoke all on table public.admin_group_invites from public, anon, authenticated;

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
  v_name text := trim(coalesce(p_group_name, ''));
  v_items_count integer;
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'manovoa@gmail.com' then
    raise exception 'No tenés permiso para crear invitaciones de administrador';
  end if;

  if v_user_id is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 40 then
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
  values (v_name, v_group_id, v_user_id)
  returning token into v_token;

  return v_token;
end;
$function$;

revoke all on function public.create_admin_group_invite(text) from public, anon;
grant execute on function public.create_admin_group_invite(text) to authenticated;

create or replace function public.get_admin_group_invite(p_token uuid)
returns table (group_name text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $function$
  select i.group_name, i.expires_at
  from public.admin_group_invites i
  where i.token = p_token
    and i.used_at is null
    and i.expires_at > now();
$function$;

revoke all on function public.get_admin_group_invite(uuid) from public;
grant execute on function public.get_admin_group_invite(uuid) to anon, authenticated;

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

  if char_length(v_alias) < 2 or new.email is null then
    raise exception 'Falta el email o el alias para crear la cuenta administradora';
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(v_invite.group_name), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'grupo';
  end if;
  v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.groups (name, slug, created_by, invite_code)
  values (v_invite.group_name, v_slug, new.id, v_invite_code)
  returning id into v_group_id;

  insert into public.seasons (group_id, name, status)
  values (v_group_id, 'Temporada ' || extract(year from now())::integer::text, 'activa');

  -- Copy the existing group's item setup as a starting point. The new group
  -- receives separate rows, so its administrator can change them independently.
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

drop trigger if exists on_admin_group_invite_created on auth.users;
create trigger on_admin_group_invite_created
after insert on auth.users
for each row
execute function public.create_admin_group_from_invite();
