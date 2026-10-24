-- テンプレートのジャンル（追加・名前変更・削除できるように独立したテーブルにする）
create table public.template_genres (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  name       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (family_id, name)
);
alter table public.template_genres enable row level security;
create policy template_genres_all on public.template_genres
  for all using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- 既存テンプレートのジャンルを登録
insert into public.template_genres (family_id, name)
select distinct family_id, category from public.event_templates where category is not null and category <> ''
on conflict do nothing;

-- 予定・テンプレートの色（null = 誰の予定かの色を使う）
alter table public.events add column color text;
alter table public.event_templates add column color text;
