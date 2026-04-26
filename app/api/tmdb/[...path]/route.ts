import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const { searchParams } = new URL(request.url)
  const TMDB_KEY = process.env.TMDB_API_KEY
  
  // Allow client to pass lang explicitly; fall back to cookie
  const clientLang = searchParams.get('lang')
  let lang = clientLang
  if (!lang) {
    const cookieStore = await cookies()
    lang = cookieStore.get('mashhad-lang')?.value || 'ar'
  }
  const tmdbLang = lang === 'ar' ? 'ar-SA' : 'en-US'

  const tmdbPath = path.join('/')
  const queryParams = new URLSearchParams(searchParams)
  queryParams.delete('lang') // Remove our custom param before forwarding to TMDB
  queryParams.set('language', tmdbLang)
  queryParams.set('api_key', TMDB_KEY!)

  // Search queries should not be cached as aggressively
  const isSearch = tmdbPath.includes('search')

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${tmdbPath}?${queryParams.toString()}`,
      { next: { revalidate: isSearch ? 300 : 3600 } }
    )
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch {
    return NextResponse.json({ error: 'TMDB request failed' }, { status: 500 })
  }
}
