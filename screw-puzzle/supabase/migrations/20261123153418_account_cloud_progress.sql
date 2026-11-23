begin;
create table public.player_progress (
 player_id uuid not null references auth.users(id) on delete cascade,
 level_id text not null,
 layout_version integer not null check (layout_version>0),
 revision bigint not null default 0 check (revision>=0),
 checkpoint jsonb,
 writer_session uuid,
 cleared boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(player_id,level_id,layout_version),
 check (checkpoint is null or jsonb_typeof(checkpoint)='object')
);
alter table public.player_progress enable row level security;
alter table public.player_progress force row level security;
revoke all on public.player_progress from public,anon,authenticated,service_role;
grant select on public.player_progress to authenticated;
create policy progress_read_own on public.player_progress for select to authenticated using ((select auth.uid())=player_id);

create function leaderboard_private.cloud_progress(p_action text,p_level text,p_layout integer,p_session uuid,p_revision bigint,p_checkpoint jsonb,p_cleared boolean,p_expected_player uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_player uuid:=auth.uid(); v_row public.player_progress%rowtype; v_result jsonb;
begin
 if v_player is null or p_expected_player is distinct from v_player or not exists(
  select 1 from auth.users u where u.id=v_player and not u.is_anonymous
   and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')
 ) then raise exception using errcode='42501',message='google_required'; end if;
 if p_action not in ('begin','save','completed') or p_action is null or p_revision is null or p_revision<0 or p_cleared is null
 or not exists(select 1 from public.casual_boards b where b.level_id=p_level and b.layout_version=p_layout and b.active)
 or (p_action in ('begin','save') and p_session is null)
 then raise exception using errcode='22023',message='invalid_progress'; end if;
 if p_checkpoint is not null then
  if jsonb_typeof(p_checkpoint)<>'object' or pg_column_size(p_checkpoint)>32768
   or jsonb_typeof(p_checkpoint->'seed') is distinct from 'number'
   or jsonb_typeof(p_checkpoint->'elapsedMs') is distinct from 'number'
   or jsonb_typeof(p_checkpoint->'runId') is distinct from 'string'
   or jsonb_typeof(p_checkpoint->'moves') is distinct from 'array'
   or not coalesce((p_checkpoint->>'seed') ~ '^[0-9]{1,10}$',false)
   or not coalesce((p_checkpoint->>'elapsedMs') ~ '^[0-9]{1,10}$',false)
   or not coalesce((p_checkpoint->>'runId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
  then raise exception using errcode='22023',message='invalid_progress'; end if;
  if (p_checkpoint->>'seed')::bigint>4294967295 or (p_checkpoint->>'elapsedMs')::bigint>2592000000
   or jsonb_array_length(p_checkpoint->'moves')>512
   or exists(select 1 from jsonb_array_elements(p_checkpoint->'moves') m where jsonb_typeof(m)<>'string' or length(m#>>'{}')>80)
  then raise exception using errcode='22023',message='invalid_progress'; end if;
  if p_checkpoint ? 'findReadyAt' then
   if jsonb_typeof(p_checkpoint->'findReadyAt') is distinct from 'number' or not coalesce((p_checkpoint->>'findReadyAt') ~ '^[0-9]{1,16}$',false)
   then raise exception using errcode='22023',message='invalid_progress'; end if;
   if (p_checkpoint->>'findReadyAt')::bigint>9007199254740991 then raise exception using errcode='22023',message='invalid_progress'; end if;
  end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(v_player::text||':'||p_level||':'||p_layout::text,0));
 insert into public.player_progress(player_id,level_id,layout_version) values(v_player,p_level,p_layout) on conflict do nothing;
 select * into v_row from public.player_progress where player_id=v_player and level_id=p_level and layout_version=p_layout for update;
 if p_action='begin' then
  update public.player_progress set writer_session=p_session,revision=revision+1,updated_at=now() where player_id=v_player and level_id=p_level and layout_version=p_layout returning * into v_row;
 elsif p_action='completed' then
  update public.player_progress set cleared=true,updated_at=now() where player_id=v_player and level_id=p_level and layout_version=p_layout returning * into v_row;
 else
  if v_row.writer_session is distinct from p_session then return jsonb_build_object('status','moved'); end if;
  if v_row.revision<>p_revision then return jsonb_build_object('status','retry','revision',v_row.revision); end if;
  update public.player_progress set checkpoint=p_checkpoint,cleared=cleared or p_cleared,revision=revision+1,updated_at=now() where player_id=v_player and level_id=p_level and layout_version=p_layout returning * into v_row;
 end if;
 v_result:=to_jsonb(v_row)-'player_id'-'writer_session';
 if p_action='save' then v_result:=v_result-'checkpoint'; end if;
 return jsonb_build_object('status','saved','record',v_result);
end $$;
revoke all on function leaderboard_private.cloud_progress(text,text,integer,uuid,bigint,jsonb,boolean,uuid) from public,anon,authenticated;
grant execute on function leaderboard_private.cloud_progress(text,text,integer,uuid,bigint,jsonb,boolean,uuid) to authenticated;
create function public.cloud_progress(p_action text,p_level text,p_layout integer,p_session uuid,p_revision bigint,p_checkpoint jsonb,p_cleared boolean,p_expected_player uuid) returns jsonb
language sql security invoker set search_path='' as $$ select leaderboard_private.cloud_progress(p_action,p_level,p_layout,p_session,p_revision,p_checkpoint,p_cleared,p_expected_player) $$;
revoke all on function public.cloud_progress(text,text,integer,uuid,bigint,jsonb,boolean,uuid) from public,anon,authenticated;
grant execute on function public.cloud_progress(text,text,integer,uuid,bigint,jsonb,boolean,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
