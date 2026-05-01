import type { AniListMedia } from './anilist'

const TMDB_BASE = 'https://api.themoviedb.org/3'

interface TmdbSearchResult {
  id: number
  name: string
  original_name: string
  first_air_date?: string
  genre_ids?: number[]
  original_language?: string
}

interface TmdbMovieResult {
  id: number
  title: string
  original_title: string
  release_date?: string
  genre_ids?: number[]
  original_language?: string
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function titleScore(candidate: string, target: string): number {
  const a = normalizeTitle(candidate)
  const b = normalizeTitle(target)
  if (!a || !b) return 0
  if (a === b) return 50
  if (a.includes(b) || b.includes(a)) return 30

  const tokensA = new Set(a.split(' '))
  const tokensB = new Set(b.split(' '))
  let overlap = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1
  }
  return Math.min(overlap * 3, 15)
}

function yearScore(animeYear: number | null, tmdbDate?: string): number {
  if (!animeYear || !tmdbDate) return 0
  const year = parseInt(tmdbDate.slice(0, 4), 10)
  if (!year) return 0
  const diff = Math.abs(year - animeYear)
  if (diff === 0) return 12
  if (diff === 1) return 8
  if (diff === 2) return 4
  return 0
}

async function tmdbSearchTv(query: string, year?: number | null): Promise<TmdbSearchResult[]> {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return []
  const params = new URLSearchParams({
    query,
    include_adult: 'false',
    language: 'en-US',
    api_key: apiKey,
    _bust: '2',
  })
  if (year) params.set('first_air_date_year', String(year))

  const res = await fetch(`${TMDB_BASE}/search/tv?${params.toString()}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.results) ? data.results : []
}

async function tmdbSearchMovie(query: string, year?: number | null): Promise<TmdbMovieResult[]> {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return []
  const params = new URLSearchParams({
    query,
    include_adult: 'false',
    language: 'en-US',
    api_key: apiKey,
    _bust: '2',
  })
  if (year) params.set('year', String(year))

  const res = await fetch(`${TMDB_BASE}/search/movie?${params.toString()}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.results) ? data.results : []
}

function getTitleCandidates(media: AniListMedia): string[] {
  const titles = [
    media.title?.english,
    media.title?.romaji,
    media.title?.native,
  ].filter(Boolean) as string[]
  return Array.from(new Set(titles))
}

export async function findTmdbSeriesId(media: AniListMedia): Promise<number | null> {
  const animeYear = media.seasonYear || media.startDate?.year || null
  const candidates = getTitleCandidates(media)
  if (!candidates.length) return null

  const resultsMap = new Map<number, TmdbSearchResult>()
  for (const title of candidates) {
    const results = await tmdbSearchTv(title, animeYear)
    if (results.length === 0 && animeYear) {
      const fallback = await tmdbSearchTv(title, null)
      for (const item of fallback) resultsMap.set(item.id, item)
    }
    for (const item of results) resultsMap.set(item.id, item)
  }

  let bestId: number | null = null
  let bestScore = 0

  for (const result of resultsMap.values()) {
    let score = 0
    for (const candidate of candidates) {
      const best = Math.max(
        titleScore(candidate, result.name || ''),
        titleScore(candidate, result.original_name || '')
      )
      score = Math.max(score, best)
    }

    score += yearScore(animeYear, result.first_air_date)

    if (result.original_language === 'ja') score += 6
    if (result.genre_ids?.includes(16)) score += 6

    if (score > bestScore) {
      bestScore = score
      bestId = result.id
    }
  }

  const MIN_SCORE = 40
  return bestScore >= MIN_SCORE ? bestId : null
}

export async function getTmdbTvDetails(tmdbId: number) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return null
  const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${apiKey}&_bust=2`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function findTmdbMovieId(media: AniListMedia): Promise<number | null> {
  const animeYear = media.seasonYear || media.startDate?.year || null
  const candidates = getTitleCandidates(media)
  if (!candidates.length) return null

  const resultsMap = new Map<number, TmdbMovieResult>()
  for (const title of candidates) {
    const results = await tmdbSearchMovie(title, animeYear)
    if (results.length === 0 && animeYear) {
      const fallback = await tmdbSearchMovie(title, null)
      for (const item of fallback) resultsMap.set(item.id, item)
    }
    for (const item of results) resultsMap.set(item.id, item)
  }

  let bestId: number | null = null
  let bestScore = 0

  for (const result of resultsMap.values()) {
    let score = 0
    for (const candidate of candidates) {
      const best = Math.max(
        titleScore(candidate, result.title || ''),
        titleScore(candidate, result.original_title || '')
      )
      score = Math.max(score, best)
    }

    score += yearScore(animeYear, result.release_date)

    if (result.original_language === 'ja') score += 6
    if (result.genre_ids?.includes(16)) score += 6

    if (score > bestScore) {
      bestScore = score
      bestId = result.id
    }
  }

  const MIN_SCORE = 40
  return bestScore >= MIN_SCORE ? bestId : null
}
