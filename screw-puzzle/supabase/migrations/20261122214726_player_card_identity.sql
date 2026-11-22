-- Curated avatars and opt-in public country. Existing profiles keep their names/results.
begin;
alter table public.player_profiles add column avatar text not null default 'fox' check (avatar in ('fox','cat','panda','frog','bear','bunny','penguin','lion'));
alter table public.player_profiles add column country text check (country in ('AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'));
grant insert (avatar,country), update (avatar,country) on public.player_profiles to authenticated;
create or replace function leaderboard_private.get_casual_leaderboard(p_board text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_player uuid := auth.uid(); v_result jsonb;
begin
 if not exists(select 1 from public.casual_boards b where b.id=p_board and b.active) then
   return jsonb_build_object('board_id',p_board,'open',false,'entries','[]'::jsonb,'personal',null,'players',0);
 end if;
 with best as (
   select distinct on(f.player_id) f.player_id,f.run_id,f.elapsed_ms,f.extra_box_uses,f.find_match_uses,f.resumed,f.created_at,p.nickname,p.avatar,p.country
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

notify pgrst,'reload schema';
commit;
