import { NextResponse } from 'next/server'
import { tmdb } from '@/lib/tmdb/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type') || 'movie'
  // Client can override language via query param (needed for client-fetched PersonalRows)
  const langParam = searchParams.get('lang')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Resolve language: query param > cookie > default ar
  if (langParam && (langParam === 'ar' || langParam === 'en')) {
    // Temporarily override cookie value for this request by setting it
    // Actually, we just need to pass lang to tmdb client — but the client reads from cookies.
    // So we set a cookie in the cookie store context — instead, we'll call TMDB directly here.
    const TMDB_KEY = process.env.TMDB_API_KEY
    const tmdbLang = langParam === 'en' ? 'en-US' : 'ar-SA'
    const appendResponse = type === 'tv'
      ? `append_to_response=credits,videos`
      : `append_to_response=credits,videos`
    const path = type === 'tv'
      ? `/tv/${id}?${appendResponse}&language=${tmdbLang}&api_key=${TMDB_KEY}`
      : `/movie/${id}?${appendResponse}&language=${tmdbLang}&api_key=${TMDB_KEY}`

    try {
      const res = await fetch(`https://api.themoviedb.org/3${path}`, {
        next: { revalidate: 3600 },
      })
      if (!res.ok) throw new Error('TMDB error')
      const data = await res.json()
      return NextResponse.json({
        id: data.id,
        title: data.title || data.name,
        name: data.name || data.title,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        overview: data.overview,
        vote_average: data.vote_average,
        release_date: data.release_date || data.first_air_date,
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600' },
      })
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  // No lang override — use cookie-based tmdb client (server-side)
  try {
    const data = type === 'tv'
      ? await tmdb.series(id)
      : await tmdb.movie(id)

    return NextResponse.json({
      id: data.id,
      title: data.title || data.name,
      name: data.name || data.title,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      overview: data.overview,
      vote_average: data.vote_average,
      release_date: data.release_date || data.first_air_date,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
