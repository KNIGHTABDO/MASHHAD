import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const { searchParams } = new URL(request.url)
  const TMDB_KEY = process.env.TMDB_API_KEY
  
  const cookieStore = await cookies()
  const lang = cookieStore.get('mashhad-lang')?.value || 'ar'
  const tmdbLang = lang === 'ar' ? 'ar-SA' : 'en-US'

  const tmdbPath = path.join('/')
  const queryParams = new URLSearchParams(searchParams)
  queryParams.set('language', tmdbLang)
  queryParams.set('api_key', TMDB_KEY!)

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${tmdbPath}?${queryParams.toString()}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch {
    return NextResponse.json({ error: 'TMDB request failed' }, { status: 500 })
  }
}
