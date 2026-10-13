-- 日付セルの背景色（月表示で日付マスを長押しして設定）
create table public.day_colors (
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  date        date not null,
  color       text not null,
  updated_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (calendar_id, date)
);

alter table public.day_colors enable row level security;

create policy day_colors_all on public.day_colors
  for all using (public.can_access_calendar(calendar_id))
  with check (public.can_access_calendar(calendar_id));

alter publication supabase_realtime add table public.day_colors;
