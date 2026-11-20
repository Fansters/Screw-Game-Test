begin;

-- Score writes are private and server-only. Never grant browser roles INSERT
-- on verified_runs or add a public "submit my time" RPC.
create schema if not exists ranking_private;
revoke all on schema ranking_private from public, anon, authenticated, service_role;
grant usage on schema ranking_private to service_role;

create table public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nickname_format check (
    char_length(nickname) between 3 and 20
    and nickname = btrim(nickname)
    and nickname ~ '^[A-Za-z0-9][A-Za-z0-9 _-]*$'
    and nickname !~ '  '
  )
);
create unique index player_profiles_unique_nickname on public.player_profiles (lower(nickname));
alter table public.player_profiles enable row level security;
alter table public.player_profiles force row level security;
revoke all on public.player_profiles from public, anon, authenticated, service_role;
grant select on public.player_profiles to authenticated, service_role;
grant insert (id, nickname), update (id, nickname) on public.player_profiles to authenticated;
create policy profile_read_own on public.player_profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profile_create_own on public.player_profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profile_update_own on public.player_profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function ranking_private.touch_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function ranking_private.touch_profile() from public, anon, authenticated, service_role;
create trigger profile_updated before update on public.player_profiles
  for each row execute function ranking_private.touch_profile();

create table public.ranking_boards (
  id text primary key,
  level_id text not null check (level_id in ('cottage','campsite','desert','construction','carnival','zoo','space')),
  layout_version integer not null check (layout_version > 0),
  generator_version integer not null check (generator_version > 0),
  rules_version integer not null check (rules_version > 0),
  mode text not null default 'solo' check (mode = 'solo'),
  active boolean not null default false,
  unique (level_id, layout_version, generator_version, rules_version, mode),
  check (id = level_id || ':layout-' || layout_version || ':generator-' || generator_version || ':rules-' || rules_version || ':solo')
);
alter table public.ranking_boards enable row level security;
revoke all on public.ranking_boards from public, anon, authenticated, service_role;
grant select on public.ranking_boards to anon, authenticated, service_role;
create policy boards_read on public.ranking_boards for select to anon, authenticated using (true);

-- Closed intentionally until the authoritative ranked-run service is deployed.
insert into public.ranking_boards (id, level_id, layout_version, generator_version, rules_version)
select level_id || ':layout-' || layout_version || ':generator-1:rules-1:solo', level_id, layout_version, 1, 1
from (values ('cottage',2),('campsite',2),('desert',3),('construction',2),('carnival',2),('zoo',2),('space',3))
  as layouts(level_id,layout_version);

create table ranking_private.verified_runs (
  id uuid primary key,
  board_id text not null references public.ranking_boards(id),
  player_id uuid not null references auth.users(id) on delete cascade,
  puzzle_seed bigint not null check (puzzle_seed between 0 and 4294967295),
  elapsed_ms bigint not null check (elapsed_ms between 1 and 9007199254740991),
  extra_box_uses smallint not null check (extra_box_uses between 0 and 3),
  find_match_uses smallint not null check (find_match_uses between 0 and 3),
  queue_peek_uses smallint not null check (queue_peek_uses between 0 and 3),
  verified_at timestamptz not null default now()
);
create index verified_runs_board_player_best on ranking_private.verified_runs (board_id, player_id, elapsed_ms, verified_at, id);
alter table ranking_private.verified_runs enable row level security;
alter table ranking_private.verified_runs force row level security;
revoke all on ranking_private.verified_runs from public, anon, authenticated, service_role;
-- Append-only verified records. Run IDs make retrying a stored finish idempotent
-- at the future service layer; a duplicate must never overwrite a better time.
grant insert, select on ranking_private.verified_runs to service_role;

create function public.get_ranked_leaderboard(p_board_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  with board as (
    select active from public.ranking_boards where id = p_board_id
  ), best as (
    select distinct on (r.player_id) r.id, r.player_id, p.nickname, r.elapsed_ms, r.verified_at
    from ranking_private.verified_runs r
    join public.player_profiles p on p.id = r.player_id
    join auth.users u on u.id = r.player_id
    where r.board_id = p_board_id and (select active from board)
      and u.is_anonymous is false and u.email_confirmed_at is not null
    order by r.player_id, r.elapsed_ms, r.verified_at, r.id
  ), ranked as (
    select rank() over (order by elapsed_ms) as place, id, nickname, elapsed_ms, verified_at
    from best
  ), limited as (
    select * from ranked order by elapsed_ms, verified_at, id limit 10
  )
  select pg_catalog.jsonb_build_object(
    'board_id', p_board_id,
    'open', coalesce((select active from board), false),
    'entries', coalesce((select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('place',place,'nickname',nickname,'elapsed_ms',elapsed_ms,'verified_at',verified_at)
      order by elapsed_ms,verified_at,id
    ) from limited), '[]'::jsonb)
  );
$$;
revoke all on function public.get_ranked_leaderboard(text) from public, anon, authenticated, service_role;
grant execute on function public.get_ranked_leaderboard(text) to anon, authenticated, service_role;

commit;
