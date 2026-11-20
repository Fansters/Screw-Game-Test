begin;

-- Keep privileged Auth/private-table access outside the exposed schema. Only
-- the trusted server can invoke this helper; browser roles have no access.
alter function public.get_ranked_leaderboard(text) set schema ranking_private;
revoke all on function ranking_private.get_ranked_leaderboard(text) from public, anon, authenticated, service_role;
grant execute on function ranking_private.get_ranked_leaderboard(text) to service_role;

-- The future public HTTP leaderboard endpoint calls this server-only wrapper.
-- It is INVOKER, so an accidental browser grant still cannot read private data.
create function public.get_ranked_leaderboard(p_board_id text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select ranking_private.get_ranked_leaderboard(p_board_id);
$$;
revoke all on function public.get_ranked_leaderboard(text) from public, anon, authenticated, service_role;
grant execute on function public.get_ranked_leaderboard(text) to service_role;

-- The board-first score index cannot cover player-only foreign-key lookups.
create index verified_runs_player_id on ranking_private.verified_runs(player_id);

commit;
