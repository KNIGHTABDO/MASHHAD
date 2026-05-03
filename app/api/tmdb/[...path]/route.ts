import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'

// Allowlist of valid TMDB path prefixes — prevents proxying arbitrary TMDB endpoints
const ALLOWED_TMDB_PREFIXES = [
  'movie/', 'tv/', 'search/', 'trending/', 'person/', 'discover/',
  'configuration/', 'genre/', 'network/', 'collection/', 'keyword/',
]

function isAllowedPath(path: string): boolean {
  return ALLOWED_TMDB_PREFIXES.some(prefix => path.startsWith(prefix))
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const tmdbPath = path.join('/')

  // Auth check — prevents unauthenticated users from burning our TMDB quota
  // Bypass auth for trending content (used on landing page)
  const isPublicPath = tmdbPath.startsWith('trending/')
  
  if (!isPublicPath) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Auth error' }, { status: 401 })
    }
  }
  const { searchParams } = new URL(request.url)
  const TMDB_KEY = process.env.TMDB_API_KEY

  // Path allowlist check
  if (!isAllowedPath(tmdbPath)) {
    return NextResponse.json({ error: 'Path not allowed' }, { status: 403 })
  }

  // Allow client to pass lang explicitly; fall back to cookie
  const clientLang = searchParams.get('lang')
  let lang = clientLang
  if (!lang) {
    const cookieStore = await cookies()
    lang = cookieStore.get('mashhad-lang')?.value || 'ar'
  }
  const tmdbLang = lang === 'ar' ? 'ar-SA' : 'en-US'

  const queryParams = new URLSearchParams(searchParams)
  queryParams.delete('lang') // Remove our custom param before forwarding to TMDB
  queryParams.set('language', tmdbLang)
  queryParams.set('api_key', TMDB_KEY!)
  queryParams.set('_bust', '2') // Bust Next.js fetch cache

  // Search queries should not be cached as aggressively
  const isSearch = tmdbPath.includes('search')

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${tmdbPath}?${queryParams.toString()}`,
      { next: { revalidate: isSearch ? 300 : 3600 } }
    )
    const data = await res.json()
    
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch {
    return NextResponse.json({ error: 'TMDB request failed' }, { status: 500 })
  }
}
