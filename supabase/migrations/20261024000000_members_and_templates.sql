-- 「誰の予定か」：家族メンバー（auth.users）を予定に紐づける。null = 家族みんな
alter table public.events
  add column member_id uuid references auth.users (id) on delete set null;

-- 予定テンプレート：繰り返し発生する「誰の・どんな予定か」を保存して、予定追加時に呼び出す
create table public.event_templates (
  id                    uuid primary key default gen_random_uuid(),
  family_id             uuid not null references public.families (id) on delete cascade,
  title                 text not null,
  icon                  text,
  member_id             uuid references auth.users (id) on delete set null,
  calendar_id           uuid references public.calendars (id) on delete set null,
  all_day               boolean not null default false,
  start_time            text check (start_time ~ '^\d{2}:\d{2}$'),  -- 'HH:mm'
  end_time              text check (end_time ~ '^\d{2}:\d{2}$'),
  rrule                 text,
  remind_minutes_before integer[] not null default '{}',
  location              text,
  memo                  text,
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now()
);
create index event_templates_family_idx on public.event_templates (family_id);

alter table public.event_templates enable row level security;

create policy event_templates_all on public.event_templates
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
