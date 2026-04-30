import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: Save a user's subtitle sync offset vote
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      profile_id: user.id,
      subtitle_file_id,
      offset_ms: clamped,
    },
    { onConflict: 'profile_id,subtitle_file_id' }
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
  if (!subtitleFileId) {
    return NextResponse.json({ error: 'Missing subtitle_file_id' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subtitle_sync_votes')
    .select('offset_ms')
    .eq('subtitle_file_id', subtitleFileId)

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
