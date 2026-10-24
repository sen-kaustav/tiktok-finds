-- Catalogue table, RLS and private thumbs bucket for TikTok Finds.

create or replace function public.immutable_array_to_string(arr text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$ select array_to_string(arr, ' ') $$;

create table public.videos (
  video_id      text primary key,
  canonical_url text not null,
  posted_at     date,
  caption       text,
  hashtags      text,
  category      text not null check (category in ('food recipe', 'restaurant')),
  cuisine       text,
  meal_type     text,
  dish          text,
  location      text,
  venue_names   text[] not null default '{}',
  dietary       text[] not null default '{}',
  confidence    text check (confidence in ('high', 'medium', 'low')),
  reason        text,
  thumb_path    text,
  source        text not null default 'pipeline' check (source in ('pipeline', 'manual')),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  search        tsvector generated always as (
    to_tsvector('simple',
      coalesce(caption, '') || ' ' || coalesce(hashtags, '') || ' ' ||
      coalesce(cuisine, '') || ' ' || coalesce(meal_type, '') || ' ' ||
      coalesce(dish, '') || ' ' || coalesce(location, '') || ' ' ||
      public.immutable_array_to_string(venue_names) || ' ' ||
      public.immutable_array_to_string(dietary))
  ) stored
);

create index videos_search_idx on public.videos using gin (search);
create index videos_category_idx on public.videos (category);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

alter table public.videos enable row level security;

create policy "videos select" on public.videos for select to authenticated using (true);
create policy "videos insert" on public.videos for insert to authenticated with check (true);
create policy "videos update" on public.videos for update to authenticated using (true) with check (true);
create policy "videos delete" on public.videos for delete to authenticated using (true);

-- Private bucket for thumbnails.
insert into storage.buckets (id, name, public)
values ('thumbs', 'thumbs', false)
on conflict (id) do nothing;

create policy "thumbs select" on storage.objects for select to authenticated
  using (bucket_id = 'thumbs');
create policy "thumbs insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'thumbs');
create policy "thumbs update" on storage.objects for update to authenticated
  using (bucket_id = 'thumbs') with check (bucket_id = 'thumbs');
