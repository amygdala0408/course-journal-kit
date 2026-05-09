-- Course Journal Kit — Supabase schema
--
-- Run this in the Supabase SQL editor once when you set up the project.
-- The app works without it; this only enables optional cross-device sync.
--
-- Convention: every row stores its full JSON payload in the `data` column so
-- the local schema can evolve without a database migration. Sync is
-- last-write-wins per row using `updated_at` (server time) and
-- `client_updated_at` (whatever the local client thought the row's timestamp
-- was at write time, used for conflict resolution).

create extension if not exists "pgcrypto";

-- Generic row type used by all per-user tables.
create or replace function set_owner_and_timestamps()
returns trigger language plpgsql as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Per-user tables ----------------------------------------------------------
create table if not exists entries (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  data jsonb not null,
  client_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists entries_owner_idx on entries (owner_id);
create index if not exists entries_owner_course_idx on entries (owner_id, course_id);
create trigger entries_set on entries
  before insert or update on entries
  for each row execute procedure set_owner_and_timestamps();

create table if not exists sources (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  data jsonb not null,
  client_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists sources_owner_idx on sources (owner_id);
create trigger sources_set on sources
  before insert or update on sources
  for each row execute procedure set_owner_and_timestamps();

create table if not exists exploration_areas (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  data jsonb not null,
  client_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists exploration_owner_idx on exploration_areas (owner_id);
create trigger exploration_set on exploration_areas
  before insert or update on exploration_areas
  for each row execute procedure set_owner_and_timestamps();

create table if not exists review_cards (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  data jsonb not null,
  client_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists review_cards_owner_idx on review_cards (owner_id);
create trigger review_cards_set on review_cards
  before insert or update on review_cards
  for each row execute procedure set_owner_and_timestamps();

create table if not exists syntheses (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  data jsonb not null,
  client_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists syntheses_owner_idx on syntheses (owner_id);
create trigger syntheses_set on syntheses
  before insert or update on syntheses
  for each row execute procedure set_owner_and_timestamps();

create table if not exists course_packs (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  client_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists course_packs_owner_idx on course_packs (owner_id);
create trigger course_packs_set on course_packs
  before insert or update on course_packs
  for each row execute procedure set_owner_and_timestamps();

-- Public share table (read-anonymously by share id) -----------------------
create table if not exists public_journals (
  share_id text primary key,
  course_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: owner-only writes, owner-only reads, except public_journals which is
-- world-readable by share_id.
alter table entries enable row level security;
alter table sources enable row level security;
alter table exploration_areas enable row level security;
alter table review_cards enable row level security;
alter table syntheses enable row level security;
alter table course_packs enable row level security;
alter table public_journals enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array['entries','sources','exploration_areas','review_cards','syntheses','course_packs'])
  loop
    execute format(
      'create policy "%1$s_owner_select" on %1$s for select using (owner_id = auth.uid());',
      t);
    execute format(
      'create policy "%1$s_owner_modify" on %1$s for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());',
      t);
  end loop;
exception when duplicate_object then null;
end $$;

-- public_journals: anyone can SELECT by share_id; only owner can write.
do $$
begin
  create policy "public_journals_read" on public_journals
    for select using (true);
  create policy "public_journals_owner_write" on public_journals
    for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Storage bucket for attachments. Run via the Supabase dashboard or:
-- insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false)
--   on conflict (id) do nothing;
-- Then add a policy so users can read/write their own folder under attachments/<auth.uid()>/...
