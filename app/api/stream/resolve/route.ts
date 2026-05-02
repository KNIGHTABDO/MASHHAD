import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveStreamGraph } from '@/lib/servers'

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

  let originalLanguage: string | undefined
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv'
    const tmdbKey = process.env.TMDB_API_KEY
    if (tmdbKey) {
      const res = await fetch(
        `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${tmdbKey}`,
        { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } }
      )
      if (res.ok) {
        const data = await res.json()
        if (typeof data.original_language === 'string') {
          originalLanguage = data.original_language
        }
      }
    }
  } catch {
    originalLanguage = undefined
  }

  try {
    const result = await resolveStreamGraph(tmdbId, type, season, episode, originalLanguage)

    try {
      const supabase = await createClient()
      const cacheRows = result.candidates
        .filter(candidate => candidate.infoHash)
        .map(candidate => ({
          content_id: tmdbId,
          content_type: type,
          season_number: season ?? null,
          episode_number: episode ?? null,
          provider: candidate.provider,
          info_hash: candidate.infoHash,
          file_idx: candidate.fileIdx ?? -1,
          release_title: candidate.releaseTitle,
          file_name: candidate.fileName,
          file_size: candidate.fileSize,
          quality: candidate.quality,
          video_codec: candidate.videoCodec,
          audio_codec: candidate.audioCodec,
          container: candidate.container,
          seeders: candidate.seeders,
          rd_cached: candidate.rdCached,
          score: candidate.score,
          last_verified_at: new Date().toISOString(),
          metadata: {
            ...(candidate.metadata || {}),
            original_language: candidate.originalLanguage,
            audio_languages: candidate.audioLanguages,
            audio_confidence: candidate.audioTrackConfidence,
            audio_source: candidate.audioTrackSource,
            is_dubbed: candidate.isDubbed,
            dub_penalty: candidate.dubPenalty,
            selected_audio_language: candidate.selectedAudioLanguage,
          },
        }))
      if (cacheRows.length > 0) {
        await supabase.from('stream_candidate_cache').upsert(cacheRows, {
          onConflict: 'content_id,content_type,season_number,episode_number,provider,info_hash,file_idx',
        })
      }
    } catch {
      // Candidate cache is an optimization; playback should never fail because it is unavailable.
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=600' },
    })
  } catch (error) {
    console.error('Stream resolve error:', error)
    return NextResponse.json({ streams: [], error: 'Failed to resolve streams' }, { status: 200 })
  }
}
