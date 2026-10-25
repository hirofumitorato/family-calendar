-- 天気予報の地点を設定・変更したら、すぐに天気を取りに行く。
-- 6時間ごとの自動取得（pg_cron の 'fetch-weather'）と同じ呼び出しを、その場で1回実行する。
-- （呼び出し先と鍵は cron のジョブに入っているものを使うので、ここに鍵は書かない）
-- cron がまだ設定されていなければ何もしない（次の自動取得を待つ）。
create or replace function public.fetch_weather_now() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cmd text;
begin
  if new.latitude is null or new.longitude is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.latitude is not distinct from old.latitude
     and new.longitude is not distinct from old.longitude then
    return new;
  end if;
  begin
    select command into cmd from cron.job where jobname = 'fetch-weather' limit 1;
    if cmd is not null then
      execute cmd;  -- net.http_post は非同期なので、地点の保存は待たされない
    end if;
  exception when others then
    -- 天気の取得に失敗しても、地点の保存は止めない
    raise warning 'fetch_weather_now: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.fetch_weather_now() from public, anon, authenticated;

drop trigger if exists families_fetch_weather on public.families;
create trigger families_fetch_weather
  after insert or update of latitude, longitude on public.families
  for each row execute function public.fetch_weather_now();

-- 天気が届いたらアプリの表示も自動で更新する（RLS により自分の家族の分だけ届く）
alter publication supabase_realtime add table public.weather_daily;
