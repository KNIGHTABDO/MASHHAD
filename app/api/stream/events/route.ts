import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_EVENTS = new Set([
  'resolve_started',
  'variant_selected',
  'first_frame',
  'buffering_start',
  'buffering_end',
  'stream_error',
  'fallback',
  'ended',
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const eventType = body.event_type
  if (typeof eventType !== 'string' || !VALID_EVENTS.has(eventType)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
  }

  const row = {
    user_id: user.id,
    profile_id: typeof body.profile_id === 'string' ? body.profile_id : null,
    event_type: eventType,
    content_id: typeof body.content_id === 'string' ? body.content_id : null,
    content_type: typeof body.content_type === 'string' ? body.content_type : null,
    season_number: typeof body.season_number === 'number' ? body.season_number : null,
    episode_number: typeof body.episode_number === 'number' ? body.episode_number : null,
    candidate_id: typeof body.candidate_id === 'string' ? body.candidate_id : null,
    stream_variant: typeof body.stream_variant === 'string' ? body.stream_variant : null,
    provider: typeof body.provider === 'string' ? body.provider : null,
    info_hash: typeof body.info_hash === 'string' ? body.info_hash : null,
    file_idx: typeof body.file_idx === 'number' ? body.file_idx : null,
    device: typeof body.device === 'string' ? body.device.slice(0, 500) : null,
    startup_ms: typeof body.startup_ms === 'number' ? body.startup_ms : null,
    buffering_ms: typeof body.buffering_ms === 'number' ? body.buffering_ms : null,
    error_code: typeof body.error_code === 'string' ? body.error_code : null,
    playback_time_seconds: typeof body.current_time === 'number' ? body.current_time : null,
    metadata: body,
  }

  const { error } = await supabase.from('stream_playback_events').insert(row)
  if (error) {
    console.error('[Stream Events]', error)
    return NextResponse.json({ success: false }, { status: 200 })
  }

  return NextResponse.json({ success: true })
}
