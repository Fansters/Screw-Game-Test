begin;
alter policy progress_read_own on public.player_progress using (
 (select auth.uid())=player_id
 and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false
);
commit;
