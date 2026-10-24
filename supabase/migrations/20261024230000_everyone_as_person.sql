-- 「みんな」も「誰の予定？」の1項目として、名前・色の変更や削除ができるようにする
-- 各家族に「みんな」を追加し、これまで未指定（null = みんな）だった予定・テンプレートを付け替える

insert into public.family_people (family_id, name, color, sort_order)
select f.id, 'みんな', '#9E9E9E', -1
from public.families f
where not exists (
  select 1 from public.family_people p where p.family_id = f.id and p.name = 'みんな' and p.user_id is null
);

update public.events e
   set member_id = p.id
  from public.calendars c, public.family_people p
 where e.member_id is null
   and c.id = e.calendar_id
   and p.family_id = c.family_id and p.name = 'みんな' and p.user_id is null and p.sort_order = -1;

update public.event_templates t
   set member_id = p.id
  from public.family_people p
 where t.member_id is null
   and p.family_id = t.family_id and p.name = 'みんな' and p.user_id is null and p.sort_order = -1;

-- 新しく家族を作ったときも「みんな」を用意する
create or replace function public.create_family(
  family_name text,
  display_name text,
  member_color text default '#3B82F6'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into families (name, created_by) values (family_name, auth.uid())
  returning id into fid;

  insert into family_members (family_id, user_id, display_name, color, role)
  values (fid, auth.uid(), display_name, member_color, 'owner');

  insert into family_people (family_id, name, color, user_id, sort_order)
  values
    (fid, 'みんな', '#9E9E9E', null, -1),
    (fid, display_name, member_color, auth.uid(), 0);

  insert into calendars (family_id, owner_id, name, color, visibility)
  values
    (fid, null, '家族', '#F97316', 'family'),
    (fid, auth.uid(), display_name, member_color, 'personal');

  return fid;
end $$;
