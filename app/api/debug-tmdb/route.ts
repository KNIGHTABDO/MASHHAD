import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const TMDB_KEY = process.env.TMDB_API_KEY
  const tmdbPath = 'tv/95479/season/1'
  const queryParams = new URLSearchParams()
  queryParams.set('language', 'en-US')
  queryParams.set('api_key', TMDB_KEY!)

  try {
    const res = await fetch(`https://api.themoviedb.org/3/${tmdbPath}?${queryParams.toString()}`)
    const data = await res.json()
    return NextResponse.json({
       status: res.status,
       episodesCount: data.episodes ? data.episodes.length : 'no episodes array',
       firstEpisode: data.episodes ? data.episodes[0].name : null,
       error: data.status_message || null
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}