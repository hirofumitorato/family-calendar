-- 繰り返し予定の「この予定のみ削除」用：除外する日（ローカル日付）
alter table public.events
  add column exdates date[] not null default '{}';
