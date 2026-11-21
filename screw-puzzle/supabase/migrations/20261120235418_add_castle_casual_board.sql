-- New scene identity: archived Moonbase records are never reused for this level.
insert into public.casual_boards(id,level_id,layout_version,screw_count,active)
values ('castle:layout-1:casual-1','castle',1,225,true);
notify pgrst,'reload schema';
