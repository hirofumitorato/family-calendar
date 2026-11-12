-- オリジナルスタンプ（家族が自分で追加する画像のスタンプ。会社・お店のマーク、家族の写真など）
-- 画像は小さく縮めて（160px 前後）、data URL のままこの表に入れる。家族のメンバーだけが読み書きできる。
-- 予定の icon / 日付スタンプには 'img:<id>' として保存する。
create table public.custom_stamps (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 20),
  image_data  text not null check (image_data like 'data:image/%' and char_length(image_data) <= 400000),
  sort_order  integer not null default 0,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index custom_stamps_family_idx on public.custom_stamps (family_id, sort_order, created_at);

alter table public.custom_stamps enable row level security;

create policy custom_stamps_all on public.custom_stamps
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- 家族の誰かが追加・削除したら、ほかの端末にもすぐ反映する
alter publication supabase_realtime add table public.custom_stamps;
