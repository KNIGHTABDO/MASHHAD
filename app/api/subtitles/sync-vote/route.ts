import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

// POST: Save a user's subtitle sync offset vote
export async function POST(request: Request) {
  const supabase = await createClient()
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { subtitle_file_id, offset_ms } = body as {
    subtitle_file_id: string
    offset_ms: number
  }

  if (!subtitle_file_id || typeof offset_ms !== 'number') {
    return NextResponse.json({ error: 'Missing subtitle_file_id or offset_ms' }, { status: 400 })
  }

  // Clamp offset to reasonable range (-10s to +10s)
  const clamped = Math.max(-10000, Math.min(10000, offset_ms))

  const { error } = await supabase.from('subtitle_sync_votes').upsert(
    {
      profile_id: userId,
      subtitle_file_id,
      offset_ms: clamped,
      content_id: typeof body.content_id === 'string' ? body.content_id : null,
      content_type: typeof body.content_type === 'string' ? body.content_type : null,
      season_number: typeof body.season_number === 'number' ? body.season_number : null,
      episode_number: typeof body.episode_number === 'number' ? body.episode_number : null,
      stream_file_name: typeof body.stream_file_name === 'string' ? body.stream_file_name : null,
      stream_hash: typeof body.stream_hash === 'string' ? body.stream_hash : null,
      language: typeof body.language === 'string' ? body.language : null,
    },
    { onConflict: 'profile_id,subtitle_file_id,content_id,content_type,season_number,episode_number,stream_hash,language' }
  )

  if (error) {
    console.error('[Subtitle Sync Vote] DB error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// GET: Get average offset for a subtitle file
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const subtitleFileId = searchParams.get('subtitle_file_id')
  const contentId = searchParams.get('content_id')
  const streamHash = searchParams.get('stream_hash')
  if (!subtitleFileId) {
    return NextResponse.json({ error: 'Missing subtitle_file_id' }, { status: 400 })
  }

  const supabase = await createClient()
  let query = supabase
    .from('subtitle_sync_votes')
    .select('offset_ms')
    .eq('subtitle_file_id', subtitleFileId)
  if (contentId) query = query.eq('content_id', contentId)
  if (streamHash) query = query.eq('stream_hash', streamHash)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ averageOffset: 0, voteCount: 0 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ averageOffset: 0, voteCount: 0 })
  }

  const sum = data.reduce((acc, row) => acc + (row.offset_ms || 0), 0)
  const average = Math.round(sum / data.length)

  return NextResponse.json({ averageOffset: average, voteCount: data.length })
}
