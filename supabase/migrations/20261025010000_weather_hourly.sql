-- 時間ごとの天気予報キャッシュ（Edge Function fetch-weather が書き込む）
-- 日付の詳細で天気をタップすると、その日の時間ごとの気温・降水確率を表示する
create table public.weather_hourly (
  family_id     uuid not null references public.families (id) on delete cascade,
  date          date not null,
  hour          smallint not null check (hour between 0 and 23),
  weather_code  integer not null,   -- WMO weather code（Open-Meteo）
  temp          numeric(4, 1),
  precip_prob   integer,
  fetched_at    timestamptz not null default now(),
  primary key (family_id, date, hour)
);

alter table public.weather_hourly enable row level security;

-- 家族メンバーは参照のみ（書き込みは service_role の Edge Function）
create policy weather_hourly_select on public.weather_hourly
  for select using (public.is_family_member(family_id));
