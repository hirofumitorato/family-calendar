-- 自動で作った予定の出どころ（例：'kaiun' = 開運カレンダー）。手で作った予定は null
-- 開運カレンダーをオフにしたとき・作り直すときに、まとめて削除するために使う
alter table public.events add column source text;
create index events_source_idx on public.events (calendar_id, source, starts_at) where source is not null;
