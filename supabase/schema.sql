-- Yuva — Supabase schema (ЗАХОД 4)
-- Run once in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Idempotent where practical (safe to re-run). RLS is enabled on every table.
--
-- Covers all stages: profiles + auth trigger (stage 1), listings + photos +
-- storage (stages 2-3), conversations + messages (stage 4), favorites,
-- notifications. UI wiring lands stage by stage; the schema is created up front
-- so we avoid migrations later.

-- =============================================================================
-- Helper: auto-update updated_at on row change
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- profiles  (extends auth.users — one row per user)
-- =============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text,                       -- +994…
  role        text not null default 'user' check (role in ('user', 'agent')),
  verified    boolean not null default false,
  agency_name text,
  bio         text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles are publicly readable (seller name/avatar shown on listings).
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- A user may insert/update only their own profile row.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- On signup, auto-create the matching profile row from the signUp metadata
-- (full_name, phone, role passed in options.data on the client).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- agencies  (real-estate agencies; profiles.agency_id links an agent to one)
-- =============================================================================
create table if not exists public.agencies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo_url    text,
  phone       text,
  email       text,
  website     text,
  is_partner  boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.agencies enable row level security;

-- Agencies are publicly readable (logo/name shown on listings + profiles).
-- No insert/update/delete policies on purpose — agencies are managed only via
-- the Dashboard / service_role, never the client.
drop policy if exists "agencies_select_all" on public.agencies;
create policy "agencies_select_all"
  on public.agencies for select
  to anon, authenticated
  using (true);

-- Link an agent's profile to its agency. Idempotent for existing databases.
alter table public.profiles
  add column if not exists agency_id uuid references public.agencies (id) on delete set null;

-- =============================================================================
-- listings
-- =============================================================================
create table if not exists public.listings (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  deal_type      text not null check (deal_type in ('sale', 'rent')),
  property_type  text not null,                    -- apartment | house | land | object
  build_type     text check (build_type in ('new', 'secondary')),
  price_azn      numeric not null,
  currency       text not null default 'AZN',
  rent_period    text check (rent_period in ('monthly', 'daily')),
  area_m2        numeric,
  land_area_sot  numeric,
  rooms          int,
  baths          int,
  floor          int,
  floor_total    int,
  place_id       text,                             -- lib/places.ts id
  metro_id       text,
  district       text,
  lat            double precision,
  lng            double precision,
  furnished      boolean not null default false,
  mortgage       boolean not null default false,
  has_deed       boolean not null default false,   -- купчая / çıxarış
  description    text,
  amenities      text[] not null default '{}',
  contact_phone  text,
  contact_type   text check (contact_type in ('owner', 'agent')),
  status         text not null default 'active'
                   check (status in ('active', 'sold', 'archived', 'moderation')),
  premium        boolean not null default false,
  views_count    int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create index if not exists listings_status_created_idx
  on public.listings (status, created_at desc);
create index if not exists listings_deal_property_idx
  on public.listings (deal_type, property_type);
create index if not exists listings_owner_idx
  on public.listings (owner_id);

alter table public.listings enable row level security;

-- Anyone sees active listings; the owner also sees their own non-active ones.
drop policy if exists "listings_select_visible" on public.listings;
create policy "listings_select_visible"
  on public.listings for select
  using (status = 'active' or owner_id = auth.uid());

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
  on public.listings for insert
  with check (owner_id = auth.uid());

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own"
  on public.listings for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "listings_delete_own" on public.listings;
create policy "listings_delete_own"
  on public.listings for delete
  using (owner_id = auth.uid());

-- =============================================================================
-- listing_photos
-- =============================================================================
create table if not exists public.listing_photos (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  url         text not null,                -- Storage path/public URL
  sort        int not null default 0,       -- 0 = cover
  created_at  timestamptz not null default now()
);

create index if not exists listing_photos_listing_idx
  on public.listing_photos (listing_id, sort);

alter table public.listing_photos enable row level security;

-- Visible if the parent listing is visible to the caller.
drop policy if exists "listing_photos_select_visible" on public.listing_photos;
create policy "listing_photos_select_visible"
  on public.listing_photos for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.owner_id = auth.uid())
    )
  );

-- Insert/update/delete only on listings you own.
drop policy if exists "listing_photos_write_own" on public.listing_photos;
create policy "listing_photos_write_own"
  on public.listing_photos for all
  using (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.owner_id = auth.uid())
  );

-- =============================================================================
-- favorites
-- =============================================================================
create table if not exists public.favorites (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  listing_id  uuid not null references public.listings (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favorites_own" on public.favorites;
create policy "favorites_own"
  on public.favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================================
-- conversations
-- =============================================================================
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references public.listings (id) on delete set null,
  buyer_id    uuid not null references public.profiles (id) on delete cascade,
  seller_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- Per-user chat state (each participant independently). "Delete for me" is a
  -- timestamp, not a flag: a message newer than it auto-returns the
  -- conversation (Telegram-style). Pin sorts the conversation to the top.
  buyer_hidden_at  timestamptz,
  seller_hidden_at timestamptz,
  buyer_pinned     boolean not null default false,
  seller_pinned    boolean not null default false,
  unique (listing_id, buyer_id)
);

-- Idempotent for databases created before the per-user chat-state columns.
alter table public.conversations
  add column if not exists buyer_hidden_at  timestamptz,
  add column if not exists seller_hidden_at timestamptz,
  add column if not exists buyer_pinned  boolean not null default false,
  add column if not exists seller_pinned boolean not null default false;

create index if not exists conversations_buyer_idx on public.conversations (buyer_id);
create index if not exists conversations_seller_idx on public.conversations (seller_id);

alter table public.conversations enable row level security;

-- Only the two participants can see / create their conversation.
drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
  on public.conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists "conversations_insert_buyer" on public.conversations;
create policy "conversations_insert_buyer"
  on public.conversations for insert
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

-- Either participant may update the conversation row (their hide/pin state).
drop policy if exists "conversations_update_participant" on public.conversations;
create policy "conversations_update_participant"
  on public.conversations for update
  using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

-- =============================================================================
-- messages
-- =============================================================================
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null,
  read             boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

-- See messages only in conversations you participate in.
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Send only as yourself, and only into a conversation you participate in.
drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Mark messages read (update) within your conversations.
drop policy if exists "messages_update_participant" on public.messages;
create policy "messages_update_participant"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- =============================================================================
-- notifications
-- =============================================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in ('price_drop', 'new_match', 'message')),
  payload     jsonb not null default '{}',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================================
-- Storage: listing-photos bucket (used in stage 3)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- Public read for listing photos.
drop policy if exists "listing_photos_public_read" on storage.objects;
create policy "listing_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

-- Authenticated users may upload/manage files under their own folder
-- (path convention: "<auth.uid()>/<listing_id>/<file>").
drop policy if exists "listing_photos_insert_own" on storage.objects;
create policy "listing_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing_photos_update_own" on storage.objects;
create policy "listing_photos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing_photos_delete_own" on storage.objects;
create policy "listing_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Realtime: live chat (stage 4C delivery + 4G live conversation list)
-- =============================================================================
-- Publish messages so realtime postgres_changes broadcasts INSERTs (RLS-filtered
-- to participants). "add table" errors if it's already a member → guard it.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

-- =============================================================================
-- Storage: avatars bucket (profile photos)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read for avatars.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Authenticated users may upload/manage files under their own folder
-- (path convention: "<auth.uid()>/<file>").
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
