create or replace function public.calcular_valor_mercado(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_season_id          uuid;
  v_match_number       int;
  v_group_id           uuid;
  v_presentismo        int;
  v_dt_pick_value      int;
  v_equipo_ideal_value int;
  v_cupo               int;
  v_prev_number        int;
  v_prev_cupo          int;
begin
  select season_id, number, group_id, cupo
  into v_season_id, v_match_number, v_group_id, v_cupo
  from public.matches
  where id = p_match_id;

  select presentismo_value, dt_pick_value, equipo_ideal_value
  into v_presentismo, v_dt_pick_value, v_equipo_ideal_value
  from public.groups
  where id = v_group_id;

  select max(m.number)
  into v_prev_number
  from public.matches m
  where m.season_id = v_season_id
    and m.number < v_match_number
    and m.status in ('jugada', 'cerrada');

  select m.cupo
  into v_prev_cupo
  from public.matches m
  where m.season_id = v_season_id
    and m.number = v_prev_number;

  delete from public.market_values
  where season_id = v_season_id
    and match_number = v_match_number;

  insert into public.market_values (season_id, match_number, member_id, value)
  select
    v_season_id,
    v_match_number,
    gm.id,
    case
      when v_prev_number is null then 0
      when not exists (
        select 1
        from public.attendance a
        join public.matches m on m.id = a.match_id
        where m.season_id = v_season_id
          and m.number = v_prev_number
          and a.member_id = gm.id
          and a.status = 'presente'
      ) then coalesce((
        select mv.value
        from public.market_values mv
        where mv.season_id = v_season_id
          and mv.member_id = gm.id
          and mv.match_number < v_match_number
          and exists (
            select 1
            from public.matches played_match
            join public.attendance a on a.match_id = played_match.id
            where played_match.season_id = mv.season_id
              and played_match.number = mv.match_number - 1
              and played_match.status in ('jugada', 'cerrada')
              and a.member_id = gm.id
              and a.status = 'presente'
          )
        order by mv.match_number desc
        limit 1
      ), (
        select mv.value
        from public.market_values mv
        where mv.season_id = v_season_id
          and mv.member_id = gm.id
          and mv.match_number < v_match_number
        order by mv.match_number desc
        limit 1
      ), 0)
      else
        (
          case when exists (
            select 1
            from public.attendance a
            join public.matches m on m.id = a.match_id
            where m.season_id = v_season_id
              and m.number = v_prev_number
              and a.member_id = gm.id
              and a.status = 'presente'
          ) then v_presentismo else 0 end
          + coalesce((
            select count(*) * v_dt_pick_value
            from public.fantasy_picks fp
            join public.fantasy_teams ft on ft.id = fp.team_id
            join public.matches m on m.id = ft.match_id
            where m.season_id = v_season_id
              and m.number = v_prev_number
              and fp.member_id = gm.id
          ), 0)
          + case when gm.id in (
            select ps.member_id
            from public.player_scores ps
            join public.matches m on m.id = ps.match_id
            where m.season_id = v_season_id
              and m.number = v_prev_number
            order by ps.points desc
            limit (coalesce(v_prev_cupo, v_cupo) / 2)
          ) then v_equipo_ideal_value else 0 end
        )
    end
  from public.group_members gm
  where gm.group_id = v_group_id
    and gm.status in ('activo', 'suspendido', 'baja', 'invitado');
end;
$function$;

do $migration$
declare
  v_match_id uuid;
begin
  for v_match_id in
    select distinct on (m.season_id) m.id
    from public.matches m
    join public.seasons s on s.id = m.season_id
    where m.status = 'programada'
      and s.status = 'activa'
    order by m.season_id, m.number
  loop
    perform public.calcular_valor_mercado(v_match_id);
  end loop;
end;
$migration$;
