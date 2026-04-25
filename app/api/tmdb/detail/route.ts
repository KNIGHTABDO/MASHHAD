import { NextResponse } from 'next/server'
import { tmdb } from '@/lib/tmdb/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type') || 'movie'

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const data = type === 'tv'
      ? await (tmdb as any).tv(id)
      : await (tmdb as any).movie(id)

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
