-- Jungle Temple is a new Easy world; existing boards and permissions stay unchanged.
insert into public.casual_boards(id,level_id,layout_version,screw_count,active)
values ('jungle:layout-1:casual-1','jungle',1,144,true);
notify pgrst,'reload schema';
