import { cookies } from 'next/headers'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = process.env.TMDB_API_KEY

async function getLanguage(): Promise<string> {
  try {
    const cookieStore = await cookies()
    const lang = cookieStore.get('mashhad-lang')?.value
    return lang === 'en' ? 'en-US' : 'ar-SA'
  } catch {
    return 'ar-SA'
  }
}

async function tmdbFetch(path: string, revalidate = 3600) {
  const lang = await getLanguage()
  const separator = path.includes('?') ? '&' : '?'
  const url = `${TMDB_BASE}${path}${separator}language=${lang}&api_key=${TMDB_KEY}`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`)
  return res.json()
}

export const tmdb = {
  trending: (type: 'movie' | 'tv' | 'all', window: 'day' | 'week') =>
    tmdbFetch(`/trending/${type}/${window}`),

  movie: (id: string) =>
    tmdbFetch(`/movie/${id}?append_to_response=credits,videos,recommendations`),

  series: (id: string) =>
    tmdbFetch(`/tv/${id}?append_to_response=credits,videos,recommendations`),

  season: (seriesId: string, season: number) =>
    tmdbFetch(`/tv/${seriesId}/season/${season}`),

  person: (id: string) =>
    tmdbFetch(`/person/${id}?append_to_response=combined_credits`),


  search: (query: string) =>
    tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}`, 300),

  discover: (type: 'movie' | 'tv', filters: Record<string, string>) =>
    tmdbFetch(`/discover/${type}?${new URLSearchParams(filters)}`),

  genres: (type: 'movie' | 'tv') =>
    tmdbFetch(`/genre/${type}/list`),

  topRated: (type: 'movie' | 'tv') =>
    tmdbFetch(`/discover/${type}?sort_by=vote_average.desc&vote_count.gte=200`),

  popular: (type: 'movie' | 'tv') =>
    tmdbFetch(`/${type}/popular`),
}
