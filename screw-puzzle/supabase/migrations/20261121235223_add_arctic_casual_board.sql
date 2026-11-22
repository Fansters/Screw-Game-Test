-- Smaller puzzle budgets are metadata; submissions must still match the
-- selected board's exact count in submit_casual_finish. No permission changes.
alter table public.casual_boards drop constraint casual_boards_screw_count_check;
alter table public.casual_boards add constraint casual_boards_screw_count_check
  check (screw_count between 140 and 240 and screw_count % 3 = 0);

insert into public.casual_boards(id,level_id,layout_version,screw_count,active)
values ('arctic:layout-1:casual-1','arctic',1,150,true);
notify pgrst,'reload schema';
