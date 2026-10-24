-- 「誰の予定？」を複数選べるようにする（member_id → member_ids）
alter table public.events add column member_ids uuid[] not null default '{}';
alter table public.event_templates add column member_ids uuid[] not null default '{}';

update public.events set member_ids = array[member_id] where member_id is not null;
update public.event_templates set member_ids = array[member_id] where member_id is not null;

-- 旧カラムは使わない（互換のため残すが、FK は外して null にしておく）
alter table public.events drop constraint if exists events_member_id_fkey;
alter table public.event_templates drop constraint if exists event_templates_member_id_fkey;
update public.events set member_id = null;
update public.event_templates set member_id = null;

create index events_member_ids_idx on public.events using gin (member_ids);

-- 人を削除したら、その人を予定・テンプレートの member_ids から外す（配列には外部キーを張れないため）
create or replace function public.remove_person_from_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update events e
     set member_ids = array_remove(e.member_ids, old.id)
    from calendars c
   where c.id = e.calendar_id and c.family_id = old.family_id and old.id = any (e.member_ids);
  update event_templates t
     set member_ids = array_remove(t.member_ids, old.id)
   where t.family_id = old.family_id and old.id = any (t.member_ids);
  return old;
end $$;

create trigger family_people_remove_from_events
  after delete on public.family_people
  for each row execute function public.remove_person_from_events();
