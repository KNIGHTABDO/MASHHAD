import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // Auth check
  let supabase: Awaited<ReturnType<typeof createClient>>
  let profileId: string | null = null
  try {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ intro: null, outro: null }, { status: 401 })
    profileId = user.id
  } catch {
    return NextResponse.json({ intro: null, outro: null }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tmdb_id = searchParams.get('tmdb_id')
  const type = searchParams.get('type')
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')

  if (!tmdb_id || type !== 'tv' || !season || !episode) {
    return NextResponse.json({ intro: null, outro: null })
  }

  try {
    // 1. Get IMDB ID from TMDB
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdb_id}/external_ids?api_key=${process.env.TMDB_API_KEY}`
    )
    if (!tmdbRes.ok) throw new Error('Failed to fetch from TMDB')

    const tmdbData = await tmdbRes.json()
    const imdb_id = tmdbData.imdb_id

    if (!imdb_id) {
      return NextResponse.json({ intro: null, outro: null })
    }

    // 2. Fetch segments from IntroDB
    const introRes = await fetch(
      `https://api.introdb.app/segments?imdb_id=${imdb_id}&season=${season}&episode=${episode}`,
      { headers: { 'User-Agent': 'Mashhad-App/1.0' } }
    )

    if (!introRes.ok) {
      throw new Error('IntroDB unavailable')
    }

    const introData = await introRes.json()
    if (introData?.intro || introData?.outro || introData?.recap) {
      return NextResponse.json({ ...introData, source: 'introdb' })
    }
  } catch (error) {
    console.error('IntroDB Error:', error)
  }

  try {
    const { data } = await supabase
      .from('community_segments')
      .select('segment_type, start_sec, end_sec, vote_count, verified')
      .eq('content_id', tmdb_id)
      .eq('content_type', 'episode')
      .eq('season_number', Number(season))
      .eq('episode_number', Number(episode))
      .eq('verified', true)

    const response = { intro: null, outro: null, recap: null, source: 'community', needsCommunityVote: true } as Record<string, unknown>
    for (const segment of data || []) {
      response[segment.segment_type] = {
        start_sec: segment.start_sec,
        end_sec: segment.end_sec,
        vote_count: segment.vote_count,
      }
    }
    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ intro: null, outro: null, needsCommunityVote: true, profileId })
  }
}

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

  const segmentType = body.segment_type
  const startSec = body.start_sec
  const endSec = body.end_sec
  if (!['intro', 'outro', 'recap'].includes(String(segmentType)) || typeof startSec !== 'number' || typeof endSec !== 'number' || endSec <= startSec) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 })
  }

  const row = {
    content_id: body.content_id,
    content_type: body.content_type || 'episode',
    season_number: body.season_number,
    episode_number: body.episode_number,
    segment_type: segmentType,
    start_sec: Math.max(0, Math.round(startSec)),
    end_sec: Math.max(0, Math.round(endSec)),
    profile_id: user.id,
    vote_count: 1,
    verified: false,
  }

  const { error } = await supabase.from('community_segments').insert(row)
  if (error) {
    console.error('[Community Segments]', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
