-- Add the Egyptian Oasis catalog entry. Existing records and permissions remain unchanged.
insert into public.casual_boards(id,level_id,layout_version,screw_count,active)
values ('oasis:layout-1:casual-1','oasis',1,198,true);
notify pgrst,'reload schema';
