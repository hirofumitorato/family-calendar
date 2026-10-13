-- =====================================================================
-- family-calendar 初期スキーマ
--   families        : 家族グループ（天気予報の地点もここに持つ）
--   family_members  : 家族メンバー（表示名・色）
--   calendars       : カレンダー。visibility = personal(本人のみ) / family(家族全員)
--   events          : 予定（アイコン・リマインド・繰り返しRRULE）
--   day_stickers    : 日付マスに貼るスタンプ
--   weather_daily   : 日別天気予報キャッシュ（Edge Function fetch-weather が書き込む）
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------
create table public.families (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  invite_code   text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  latitude      double precision,
  longitude     double precision,
  location_name text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create table public.family_members (
  family_id    uuid not null references public.families (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  color        text not null default '#3B82F6',
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_idx on public.family_members (user_id);

create table public.calendars (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  owner_id   uuid references auth.users (id) on delete cascade,
  name       text not null,
  color      text not null default '#3B82F6',
  visibility text not null check (visibility in ('personal', 'family')),
  created_at timestamptz not null default now(),
  -- personal カレンダーは必ず所有者を持つ
  check (visibility = 'family' or owner_id is not null)
);
create index calendars_family_idx on public.calendars (family_id);

create table public.events (
  id                    uuid primary key default gen_random_uuid(),
  calendar_id           uuid not null references public.calendars (id) on delete cascade,
  title                 text not null,
  memo                  text,
  location              text,
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  all_day               boolean not null default false,
  rrule                 text,          -- RFC 5545 RRULE（例: FREQ=WEEKLY;BYDAY=MO）
  icon                  text,          -- 絵文字 or アイコンID（例: '🎂', 'icon:hospital'）
  remind_minutes_before integer[] not null default '{}',
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index events_calendar_time_idx on public.events (calendar_id, starts_at);

create table public.day_stickers (
  id          uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  date        date not null,
  sticker     text not null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (calendar_id, date, sticker)
);
create index day_stickers_calendar_date_idx on public.day_stickers (calendar_id, date);

create table public.weather_daily (
  family_id     uuid not null references public.families (id) on delete cascade,
  date          date not null,
  weather_code  integer not null,   -- WMO weather code（Open-Meteo）
  temp_max      numeric(4, 1),
  temp_min      numeric(4, 1),
  precip_prob   integer,
  fetched_at    timestamptz not null default now(),
  primary key (family_id, date)
);

-- updated_at 自動更新
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 権限判定ヘルパー（RLSから呼ぶ。security definer で再帰を回避）
-- ---------------------------------------------------------------------
create or replace function public.is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from family_members where family_id = fid and user_id = auth.uid()
  );
$$;

create or replace function public.can_access_calendar(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from calendars c
    join family_members m on m.family_id = c.family_id and m.user_id = auth.uid()
    where c.id = cid
      and (c.visibility = 'family' or c.owner_id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.calendars      enable row level security;
alter table public.events         enable row level security;
alter table public.day_stickers   enable row level security;
alter table public.weather_daily  enable row level security;

-- families: メンバーのみ参照・更新（作成は RPC create_family 経由）
create policy families_select on public.families
  for select using (public.is_family_member(id));
create policy families_update on public.families
  for update using (public.is_family_member(id));

-- family_members: 同じ家族のメンバー一覧は見える。自分の行だけ更新可
create policy family_members_select on public.family_members
  for select using (public.is_family_member(family_id));
create policy family_members_update_self on public.family_members
  for update using (user_id = auth.uid());

-- calendars: family は家族全員、personal は本人のみ
create policy calendars_select on public.calendars
  for select using (public.can_access_calendar(id));
create policy calendars_insert on public.calendars
  for insert with check (
    public.is_family_member(family_id)
    and (visibility = 'family' or owner_id = auth.uid())
  );
create policy calendars_update on public.calendars
  for update using (public.can_access_calendar(id));
create policy calendars_delete on public.calendars
  for delete using (
    public.can_access_calendar(id) and (visibility = 'family' or owner_id = auth.uid())
  );

-- events / day_stickers: カレンダーにアクセスできれば読み書き可
create policy events_all on public.events
  for all using (public.can_access_calendar(calendar_id))
  with check (public.can_access_calendar(calendar_id));

create policy day_stickers_all on public.day_stickers
  for all using (public.can_access_calendar(calendar_id))
  with check (public.can_access_calendar(calendar_id));

-- weather_daily: 家族メンバーは参照のみ（書き込みは service_role の Edge Function）
create policy weather_daily_select on public.weather_daily
  for select using (public.is_family_member(family_id));

-- ---------------------------------------------------------------------
-- RPC: 家族の作成 / 招待コードで参加
-- ---------------------------------------------------------------------
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

  if not exists (
    select 1 from calendars
    where family_id = fid and owner_id = auth.uid() and visibility = 'personal'
  ) then
    insert into calendars (family_id, owner_id, name, color, visibility)
    values (fid, auth.uid(), display_name, member_color, 'personal');
  end if;

  return fid;
end $$;

revoke all on function public.create_family(text, text, text) from public, anon;
revoke all on function public.join_family(text, text, text) from public, anon;
grant execute on function public.create_family(text, text, text) to authenticated;
grant execute on function public.join_family(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Realtime（予定・スタンプの変更を家族の端末へ即時配信）
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.day_stickers;
