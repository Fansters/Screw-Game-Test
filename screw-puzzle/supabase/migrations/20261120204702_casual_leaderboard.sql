-- Casual boards are independent of the closed historical ranked foundation.
create schema if not exists leaderboard_private;
revoke all on schema leaderboard_private from public, anon, authenticated;
grant usage on schema leaderboard_private to anon, authenticated;

create table public.casual_boards (
  id text primary key,
  level_id text not null,
  layout_version integer not null check (layout_version > 0),
  screw_count integer not null check (screw_count between 200 and 240),
  active boolean not null default true,
  unique (level_id, layout_version)
);
alter table public.casual_boards enable row level security;
revoke all on public.casual_boards from public, anon, authenticated;
grant select on public.casual_boards to anon, authenticated;
create policy casual_board_catalog on public.casual_boards for select to anon, authenticated using (active);
insert into public.casual_boards(id,level_id,layout_version,screw_count) values
 ('cottage:layout-2:casual-1','cottage',2,240),
 ('campsite:layout-2:casual-1','campsite',2,240),
 ('desert:layout-3:casual-1','desert',3,216),
 ('construction:layout-2:casual-1','construction',2,204),
 ('carnival:layout-2:casual-1','carnival',2,240),
 ('zoo:layout-2:casual-1','zoo',2,231);

create table leaderboard_private.casual_finishes (
  player_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null,
  board_id text not null references public.casual_boards(id),
  elapsed_ms bigint not null check (elapsed_ms between 1 and 2592000000),
  extra_box_uses smallint not null check (extra_box_uses between 0 and 3),
  find_match_uses smallint not null check (find_match_uses between 0 and 3),
  resumed boolean not null,
  created_at timestamptz not null default now(),
  primary key(player_id,run_id)
);
alter table leaderboard_private.casual_finishes enable row level security;
revoke all on leaderboard_private.casual_finishes from public, anon, authenticated;
create index casual_finishes_board_best_idx on leaderboard_private.casual_finishes(board_id,player_id,elapsed_ms,created_at,run_id);
create index casual_finishes_player_date_idx on leaderboard_private.casual_finishes(player_id,created_at desc);
-- No raw-score grants. Only the guarded functions below read/write history.

create function leaderboard_private.submit_casual_finish(p_finish jsonb,p_expected_player uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 v_player uuid := auth.uid(); v_run uuid; v_board text; v_elapsed bigint;
 v_extra smallint; v_find smallint; v_resumed boolean; v_expected integer;
 v_existing leaderboard_private.casual_finishes%rowtype;
begin
 if v_player is null or p_expected_player is distinct from v_player or not exists (
   select 1 from auth.users u where u.id=v_player and not u.is_anonymous
   and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')
 ) then raise exception using errcode='42501',message='google_required'; end if;
 if not exists(select 1 from public.player_profiles p where p.id=v_player) then
   raise exception using errcode='P0001',message='nickname_required'; end if;
 if p_finish is null or jsonb_typeof(p_finish)<>'object' or pg_column_size(p_finish)>4096
 or jsonb_typeof(p_finish->'resumed') is distinct from 'boolean'
 or jsonb_typeof(p_finish->'run_id') is distinct from 'string'
 or jsonb_typeof(p_finish->'board_id') is distinct from 'string'
 or jsonb_typeof(p_finish->'elapsed_ms') is distinct from 'number'
 or jsonb_typeof(p_finish->'extra_box_uses') is distinct from 'number'
 or jsonb_typeof(p_finish->'find_match_uses') is distinct from 'number'
 or jsonb_typeof(p_finish->'screw_count') is distinct from 'number'
 or not coalesce((p_finish->>'elapsed_ms') ~ '^[0-9]{1,10}$',false)
 or not coalesce((p_finish->>'extra_box_uses') ~ '^[0-3]$',false)
 or not coalesce((p_finish->>'find_match_uses') ~ '^[0-3]$',false)
 or not coalesce((p_finish->>'screw_count') ~ '^[0-9]{3}$',false)
 then raise exception using errcode='22023',message='invalid_finish'; end if;
 v_run := (p_finish->>'run_id')::uuid; v_board := p_finish->>'board_id';
 v_elapsed := (p_finish->>'elapsed_ms')::bigint;
 v_extra := (p_finish->>'extra_box_uses')::smallint; v_find := (p_finish->>'find_match_uses')::smallint;
 v_resumed := (p_finish->>'resumed')::boolean;
 if v_elapsed not between 1 and 2592000000 then raise exception using errcode='22023',message='invalid_finish'; end if;
 select b.screw_count into v_expected from public.casual_boards b where b.id=v_board and b.active;
 if not found then raise exception using errcode='22023',message='board_closed'; end if;
 if v_expected<>(p_finish->>'screw_count')::integer then raise exception using errcode='22023',message='invalid_finish'; end if;
 -- Serialize this player's submissions, including retries from another tab.
 perform pg_advisory_xact_lock(hashtextextended(v_player::text,0));
 select * into v_existing from leaderboard_private.casual_finishes f where f.player_id=v_player and f.run_id=v_run;
 if found then
   if (v_existing.board_id,v_existing.elapsed_ms,v_existing.extra_box_uses,v_existing.find_match_uses,v_existing.resumed)
      is distinct from (v_board,v_elapsed,v_extra,v_find,v_resumed)
   then raise exception using errcode='22023',message='finish_conflict'; end if;
   return jsonb_build_object('status','saved','run_id',v_run);
 end if;
 if (select count(*) from leaderboard_private.casual_finishes f where f.player_id=v_player and f.created_at>now()-interval '1 hour')>=120
 then raise exception using errcode='P0001',message='too_many_finishes'; end if;
 insert into leaderboard_private.casual_finishes(player_id,run_id,board_id,elapsed_ms,extra_box_uses,find_match_uses,resumed)
 values(v_player,v_run,v_board,v_elapsed,v_extra,v_find,v_resumed);
 return jsonb_build_object('status','saved','run_id',v_run);
end $$;
revoke all on function leaderboard_private.submit_casual_finish(jsonb,uuid) from public,anon,authenticated;
grant execute on function leaderboard_private.submit_casual_finish(jsonb,uuid) to authenticated;
create function public.submit_casual_finish(p_finish jsonb,p_expected_player uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select leaderboard_private.submit_casual_finish(p_finish,p_expected_player) $$;
revoke all on function public.submit_casual_finish(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.submit_casual_finish(jsonb,uuid) to authenticated;

create function leaderboard_private.get_casual_leaderboard(p_board text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_player uuid := auth.uid(); v_result jsonb;
begin
 if not exists(select 1 from public.casual_boards b where b.id=p_board and b.active) then
   return jsonb_build_object('board_id',p_board,'open',false,'entries','[]'::jsonb,'personal',null,'players',0);
 end if;
 with best as (
   select distinct on(f.player_id) f.player_id,f.run_id,f.elapsed_ms,f.extra_box_uses,f.find_match_uses,f.resumed,f.created_at,p.nickname
   from leaderboard_private.casual_finishes f join public.player_profiles p on p.id=f.player_id
   where f.board_id=p_board
   order by f.player_id,f.elapsed_ms,f.created_at,f.run_id
 ), placed as (
   select b.*,rank() over(order by b.elapsed_ms) as rank from best b
 ), top_ten as (
   select p.* from placed p order by p.elapsed_ms,p.created_at,p.run_id limit 10
 )
 select jsonb_build_object(
   'board_id',p_board,'open',true,'players',(select count(*) from placed),
   'entries',coalesce((select jsonb_agg((to_jsonb(t)-'player_id'-'run_id') || jsonb_build_object('is_you',t.player_id=v_player) order by t.elapsed_ms,t.created_at,t.run_id) from top_ten t),'[]'::jsonb),
   'personal',(select (to_jsonb(p)-'player_id'-'run_id') || jsonb_build_object('is_you',true) from placed p where p.player_id=v_player)
 ) into v_result;
 return v_result;
end $$;
revoke all on function leaderboard_private.get_casual_leaderboard(text) from public,anon,authenticated;
grant execute on function leaderboard_private.get_casual_leaderboard(text) to anon,authenticated;
create function public.get_casual_leaderboard(p_board text) returns jsonb
language sql stable security invoker set search_path = '' as $$ select leaderboard_private.get_casual_leaderboard(p_board) $$;
revoke all on function public.get_casual_leaderboard(text) from public,anon,authenticated;
grant execute on function public.get_casual_leaderboard(text) to anon,authenticated;
notify pgrst,'reload schema';
