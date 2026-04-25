import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveStreams } from '@/lib/servers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type') as 'movie' | 'episode'
  const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : undefined
  const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : undefined

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  // Validate user session
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Auth error' }, { status: 401 })
  }

  try {
    const streams = await resolveStreams(tmdbId, type, season, episode)
    return NextResponse.json({ streams }, {
      headers: { 'Cache-Control': 'private, max-age=600' },
    })
  } catch (error) {
    console.error('Stream resolve error:', error)
    return NextResponse.json({ streams: [], error: 'Failed to resolve streams' }, { status: 200 })
  }
}
