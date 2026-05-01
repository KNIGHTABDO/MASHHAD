const ANILIST_URL = 'https://graphql.anilist.co'
const DEFAULT_REVALIDATE = 3600

export interface AniListTitle {
  romaji?: string | null
  english?: string | null
  native?: string | null
}

export interface AniListCoverImage {
  large?: string | null
  extraLarge?: string | null
}

export interface AniListMedia {
  id: number
  title: AniListTitle
  description?: string | null
  coverImage?: AniListCoverImage | null
  bannerImage?: string | null
  averageScore?: number | null
  startDate?: { year?: number | null } | null
  seasonYear?: number | null
  format?: string | null
  status?: string | null
  genres?: string[] | null
  episodes?: number | null
  relations?: { edges: AniListRelationEdge[] } | null
}

export interface AniListRelationEdge {
  relationType: string
  node: AniListMediaRelation
}

export interface AniListMediaRelation {
  id: number
  title: AniListTitle
  format?: string | null
  seasonYear?: number | null
  coverImage?: AniListCoverImage | null
  bannerImage?: string | null
  episodes?: number | null
}

export function stripHtml(value: string = ''): string {
  if (!value) return ''
  const withBreaks = value.replace(/<br\s*\/?>/gi, '\n')
  const withoutTags = withBreaks.replace(/<[^>]+>/g, '')
  return withoutTags
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

export function getPreferredTitle(media: { title?: AniListTitle }, lang: 'ar' | 'en' = 'ar'): string {
  const title = media.title
  if (!title) return ''
  if (lang === 'en') return title.english || title.romaji || title.native || ''
  return title.romaji || title.english || title.native || ''
}

export function getAnimeYear(media: Pick<AniListMedia, 'seasonYear' | 'startDate'>): number | null {
  return media.seasonYear || media.startDate?.year || null
}

async function anilistRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  revalidate = DEFAULT_REVALIDATE
): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate },
  })

  if (!res.ok) throw new Error(`AniList error: ${res.status}`)
  const json = await res.json()
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || 'AniList error')
  }
  return json.data as T
}

const ANIME_CARD_FIELDS = `
  id
  title { romaji english native }
  description
  coverImage { extraLarge large }
  bannerImage
  averageScore
  seasonYear
  startDate { year }
  format
`

const ANIME_LIST_QUERY = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort], $format: MediaFormat) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: $sort, format: $format, isAdult: false) {
        ${ANIME_CARD_FIELDS}
      }
    }
  }
`

const ANIME_DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native }
      description
      coverImage { extraLarge large }
      bannerImage
      averageScore
      startDate { year }
      seasonYear
      format
      status
      genres
      episodes
      relations {
        edges {
          relationType
          node {
            id
            title { romaji english native }
            format
            seasonYear
            coverImage { extraLarge large }
            bannerImage
            episodes
          }
        }
      }
    }
  }
`

export async function getTrendingAnime(perPage = 20): Promise<AniListMedia[]> {
  const data = await anilistRequest<{ Page: { media: AniListMedia[] } }>(
    ANIME_LIST_QUERY,
    { page: 1, perPage, sort: ['TRENDING_DESC'], format: null }
  )
  return data.Page?.media || []
}

export async function getTopAnimeMovies(perPage = 20): Promise<AniListMedia[]> {
  const data = await anilistRequest<{ Page: { media: AniListMedia[] } }>(
    ANIME_LIST_QUERY,
    { page: 1, perPage, sort: ['SCORE_DESC'], format: 'MOVIE' }
  )
  return data.Page?.media || []
}

export async function getTopRatedAnime(perPage = 20): Promise<AniListMedia[]> {
  const data = await anilistRequest<{ Page: { media: AniListMedia[] } }>(
    ANIME_LIST_QUERY,
    { page: 1, perPage, sort: ['SCORE_DESC'], format: null }
  )
  return data.Page?.media || []
}

export async function getAnimeById(id: number): Promise<AniListMedia> {
  const data = await anilistRequest<{ Media: AniListMedia }>(
    ANIME_DETAIL_QUERY,
    { id }
  )
  if (!data.Media) throw new Error('Anime not found')
  return data.Media
}
