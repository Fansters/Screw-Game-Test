-- New physical layouts: never reinterpret an old checkpoint or finish.
-- Keep historical boards open for already-finished upload retries/older clients.
-- The current UI selects only its compiled layout's board.
insert into public.casual_boards(id,level_id,layout_version,screw_count,active)
values ('jungle:layout-2:casual-1','jungle',2,144,true),
       ('campsite:layout-3:casual-1','campsite',3,240,true);
notify pgrst,'reload schema';
