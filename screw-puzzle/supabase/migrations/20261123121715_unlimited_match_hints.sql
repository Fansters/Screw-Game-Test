-- Unlimited cooldown hints retain their actual use count on the same casual boards.
-- No changes to historical ranked rules, extra-box quotas or raw-score grants.
begin;
alter table leaderboard_private.casual_finishes drop constraint casual_finishes_find_match_uses_check;
alter table leaderboard_private.casual_finishes alter column find_match_uses type integer;
alter table leaderboard_private.casual_finishes add constraint casual_finishes_find_match_uses_check check (find_match_uses >= 0);
create or replace function leaderboard_private.submit_casual_finish(p_finish jsonb,p_expected_player uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 v_player uuid := auth.uid(); v_run uuid; v_board text; v_elapsed bigint;
 v_extra smallint; v_find integer; v_resumed boolean; v_expected integer;
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
 or not coalesce((p_finish->>'find_match_uses') ~ '^[0-9]{1,10}$',false)
 or not coalesce((p_finish->>'screw_count') ~ '^[0-9]{3}$',false)
 then raise exception using errcode='22023',message='invalid_finish'; end if;
 if (p_finish->>'find_match_uses')::bigint > 2147483647 then raise exception using errcode='22023',message='invalid_finish'; end if;
 v_run := (p_finish->>'run_id')::uuid; v_board := p_finish->>'board_id';
 v_elapsed := (p_finish->>'elapsed_ms')::bigint;
 v_extra := (p_finish->>'extra_box_uses')::smallint; v_find := (p_finish->>'find_match_uses')::integer;
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

notify pgrst,'reload schema';
commit;
