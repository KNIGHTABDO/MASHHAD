-- Subtitle alignment profiles: browser-calculated sync corrections

create table if not exists public.subtitle_alignment_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  profile_id uuid,
  subtitle_file_id text not null,
  content_id text not null,
  content_type text not null check (content_type in ('movie', 'episode')),
  season_number integer,
  episode_number integer,
  stream_hash text,
  stream_file_name text,
  language text,
  correction_type text not null check (correction_type in ('global_offset', 'linear_drift', 'line_snap', 'manual_marker')),
  offset_ms integer not null default 0,
  drift_rate double precision,
  confidence double precision,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subtitle_alignment_lookup
  on public.subtitle_alignment_profiles (
    subtitle_file_id,
    content_id,
    content_type,
    season_number,
    episode_number,
    stream_hash,
    language
  );

alter table public.subtitle_alignment_profiles enable row level security;

drop policy if exists "subtitle_alignment_read_auth" on public.subtitle_alignment_profiles;
create policy "subtitle_alignment_read_auth"
  on public.subtitle_alignment_profiles for select
  to authenticated
  using (true);

drop policy if exists "subtitle_alignment_write_auth" on public.subtitle_alignment_profiles;
create policy "subtitle_alignment_write_auth"
  on public.subtitle_alignment_profiles for insert
  to authenticated
  with check (true);

drop policy if exists "subtitle_alignment_update_auth" on public.subtitle_alignment_profiles;
create policy "subtitle_alignment_update_auth"
  on public.subtitle_alignment_profiles for update
  to authenticated
  using (true)
  with check (true);
