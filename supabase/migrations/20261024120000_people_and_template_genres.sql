-- =====================================================================
-- 「誰の予定？」に出る人を、アカウントの有無に関係なく追加・編集・削除できるようにする
--   family_people : 家族の人（子どもなどアプリを使わない人も含む）。user_id はアカウントがあれば紐づく
--   events.member_id / event_templates.member_id は family_people.id を指すように付け替える
-- 予定テンプレートにジャンル（category）を追加する
-- =====================================================================

create table public.family_people (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  name       text not null,
  color      text not null default '#3B82F6',
  user_id    uuid references auth.users (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index family_people_family_idx on public.family_people (family_id, sort_order);

alter table public.family_people enable row level security;
create policy family_people_all on public.family_people
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- 既存のメンバー（アカウント）を「人」として登録
insert into public.family_people (family_id, name, color, user_id)
select family_id, display_name, color, user_id from public.family_members;

-- events.member_id：auth.users → family_people に付け替え
alter table public.events drop constraint if exists events_member_id_fkey;
update public.events e
   set member_id = p.id
  from public.family_people p, public.calendars c
 where c.id = e.calendar_id and p.family_id = c.family_id and p.user_id = e.member_id;
update public.events
   set member_id = null
 where member_id is not null and member_id not in (select id from public.family_people);
alter table public.events
  add constraint events_member_id_fkey
  foreign key (member_id) references public.family_people (id) on delete set null;

-- event_templates.member_id も同様に付け替え
alter table public.event_templates drop constraint if exists event_templates_member_id_fkey;
update public.event_templates t
   set member_id = p.id
  from public.family_people p
 where p.family_id = t.family_id and p.user_id = t.member_id;
update public.event_templates
   set member_id = null
 where member_id is not null and member_id not in (select id from public.family_people);
alter table public.event_templates
  add constraint event_templates_member_id_fkey
  foreign key (member_id) references public.family_people (id) on delete set null;

-- テンプレートのジャンル（例：習い事、家事、病院）
alter table public.event_templates add column category text;

-- 家族の作成・参加時に、本人を「人」として登録する
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

  insert into family_people (family_id, name, color, user_id)
  values (fid, display_name, member_color, auth.uid());

  insert into calendars (family_id, owner_id, name, color, visibility)
  values
    (fid, null, '家族', '#F97316', 'family'),
    (fid, auth.uid(), display_name, member_color, 'personal');

  return fid;
end $$;

create or replace function public.join_family(
  code text,
  display_name text,
  member_color text default '#10B981'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into fid from families where invite_code = upper(trim(code));
  if fid is null then
    raise exception 'invalid invite code';
  end if;

  insert into family_members (family_id, user_id, display_name, color, role)
  values (fid, auth.uid(), display_name, member_color, 'member')
  on conflict (family_id, user_id) do nothing;

  if not exists (select 1 from family_people where family_id = fid and user_id = auth.uid()) then
    insert into family_people (family_id, name, color, user_id)
    values (fid, display_name, member_color, auth.uid());
  end if;

  if not exists (
    select 1 from calendars
    where family_id = fid and owner_id = auth.uid() and visibility = 'personal'
  ) then
    insert into calendars (family_id, owner_id, name, color, visibility)
    values (fid, auth.uid(), display_name, member_color, 'personal');
  end if;

  return fid;
end $$;

alter publication supabase_realtime add table public.family_people;
