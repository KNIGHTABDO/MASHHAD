-- Streaming intelligence v1: candidate cache, playback telemetry,
-- community segments, and stream-scoped subtitle sync votes.

create extension if not exists "pgcrypto";

create table if not exists public.stream_candidate_cache (
  id uuid primary key default gen_random_uuid(),
  content_id text not null,
  content_type text not null check (content_type in ('movie', 'episode')),
  season_number integer,
  episode_number integer,
  provider text not null,
  info_hash text not null,
  file_idx integer not null default -1,
  release_title text,
  file_name text,
  file_size bigint,
  quality text,
  video_codec text,
  audio_codec text,
  container text,
  seeders integer,
  rd_cached boolean default false,
  score integer default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, content_type, season_number, episode_number, provider, info_hash, file_idx)
);

create index if not exists idx_stream_candidate_content
  on public.stream_candidate_cache (content_id, content_type, season_number, episode_number, score desc);

create index if not exists idx_stream_candidate_hash
  on public.stream_candidate_cache (provider, info_hash, file_idx);

alter table public.stream_candidate_cache enable row level security;

drop policy if exists "stream_candidate_cache_read_auth" on public.stream_candidate_cache;
create policy "stream_candidate_cache_read_auth"
  on public.stream_candidate_cache for select
  to authenticated
  using (true);

drop policy if exists "stream_candidate_cache_write_auth" on public.stream_candidate_cache;
create policy "stream_candidate_cache_write_auth"
  on public.stream_candidate_cache for insert
  to authenticated
  with check (true);

drop policy if exists "stream_candidate_cache_update_auth" on public.stream_candidate_cache;
create policy "stream_candidate_cache_update_auth"
  on public.stream_candidate_cache for update
  to authenticated
  using (true)
  with check (true);

create table if not exists public.stream_playback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  profile_id uuid,
  event_type text not null check (event_type in (
    'resolve_started',
    'variant_selected',
    'first_frame',
    'buffering_start',
    'buffering_end',
    'stream_error',
    'fallback',
    'ended'
  )),
  content_id text,
  content_type text,
  season_number integer,
  episode_number integer,
  candidate_id text,
  stream_variant text,
  provider text,
  info_hash text,
  file_idx integer,
  device text,
  startup_ms integer,
  buffering_ms integer,
  error_code text,
  playback_time_seconds double precision,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_stream_events_content
  on public.stream_playback_events (content_id, content_type, created_at desc);

create index if not exists idx_stream_events_candidate
  on public.stream_playback_events (candidate_id, event_type, created_at desc);

create index if not exists idx_stream_events_user
  on public.stream_playback_events (user_id, created_at desc);

alter table public.stream_playback_events enable row level security;

drop policy if exists "stream_events_insert_own" on public.stream_playback_events;
create policy "stream_events_insert_own"
  on public.stream_playback_events for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "stream_events_select_own" on public.stream_playback_events;
create policy "stream_events_select_own"
  on public.stream_playback_events for select
  to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.community_segments (
  id uuid primary key default gen_random_uuid(),
  content_id text not null,
  content_type text not null default 'episode',
  season_number integer not null,
  episode_number integer not null,
  segment_type text not null check (segment_type in ('intro', 'outro', 'recap')),
  start_sec integer not null check (start_sec >= 0),
  end_sec integer not null check (end_sec > start_sec),
  profile_id uuid,
  vote_count integer not null default 1,
  downvote_count integer not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_segments_episode
  on public.community_segments (content_id, content_type, season_number, episode_number, segment_type, verified);

alter table public.community_segments enable row level security;

drop policy if exists "community_segments_read_auth" on public.community_segments;
create policy "community_segments_read_auth"
  on public.community_segments for select
  to authenticated
  using (true);

drop policy if exists "community_segments_insert_auth" on public.community_segments;
create policy "community_segments_insert_auth"
  on public.community_segments for insert
  to authenticated
  with check (true);

alter table if exists public.subtitle_sync_votes
  add column if not exists content_id text,
  add column if not exists content_type text,
  add column if not exists season_number integer,
  add column if not exists episode_number integer,
  add column if not exists stream_file_name text,
  add column if not exists stream_hash text,
  add column if not exists language text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_subtitle_sync_votes_scoped_unique
  on public.subtitle_sync_votes (
    profile_id,
    subtitle_file_id,
    content_id,
    content_type,
    season_number,
    episode_number,
    stream_hash,
    language
  );

create index if not exists idx_subtitle_sync_votes_lookup
  on public.subtitle_sync_votes (
    subtitle_file_id,
    content_id,
    content_type,
    season_number,
    episode_number,
    stream_hash,
    language
  );
