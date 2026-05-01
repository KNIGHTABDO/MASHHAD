import type { AniListMedia, AniListTitle } from './anilist'
import { getAnimeById, getAnimeYear } from './anilist'
import { findTmdbSeriesId, getTmdbTvDetails } from './tmdb-mapping'

export interface AnimeSeasonEntry {
  anilistId: number
  title: AniListTitle
  year: number | null
  coverImage: string | null
  bannerImage: string | null
  tmdbId: number | null
  tmdbSeasonNumber: number | null
  displaySeasonNumber: number
  episodesCount: number | null
  episodeOffset: number
}

export interface AnimeSeasonData {
  anime: AniListMedia
  seasons: AnimeSeasonEntry[]
}

const SEASON_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA'])

function getRelationId(media: AniListMedia, type: string): number | null {
  const edges = media.relations?.edges || []
  const match = edges.find(edge => edge.relationType === type)
  return match?.node?.id ?? null
}

function toSeasonEntry(media: AniListMedia, displaySeasonNumber: number): AnimeSeasonEntry {
  return {
    anilistId: media.id,
    title: media.title,
    year: getAnimeYear(media),
    coverImage: media.coverImage?.extraLarge || media.coverImage?.large || null,
    bannerImage: media.bannerImage || null,
    tmdbId: null,
    tmdbSeasonNumber: null,
    displaySeasonNumber,
    episodesCount: media.episodes || null,
    episodeOffset: 1, // 1-based start episode index
  }
}

function isSeasonFormat(media: { format?: string | null }): boolean {
  if (!media.format) return true
  return SEASON_FORMATS.has(media.format)
}

async function buildChain(root: AniListMedia): Promise<AniListMedia[]> {
  const visited = new Set<number>([root.id])
  const chain: AniListMedia[] = [root]

  let current = root
  for (let i = 0; i < 8; i += 1) {
    const prequelId = getRelationId(current, 'PREQUEL')
    if (!prequelId || visited.has(prequelId)) break
    const prequel = await getAnimeById(prequelId)
    visited.add(prequelId)
    chain.unshift(prequel)
    current = prequel
  }

  current = root
  for (let i = 0; i < 8; i += 1) {
    const sequelId = getRelationId(current, 'SEQUEL')
    if (!sequelId || visited.has(sequelId)) break
    const sequel = await getAnimeById(sequelId)
    visited.add(sequelId)
    chain.push(sequel)
    current = sequel
  }

  return chain
}

export async function buildAnimeSeasonData(anilistId: number): Promise<AnimeSeasonData> {
  const root = await getAnimeById(anilistId)
  
  if (root.format === 'MOVIE') {
    return { anime: root, seasons: [] }
  }

  const chain = await buildChain(root)
  const seasonChain = chain.filter(isSeasonFormat)
  let entries = seasonChain.map((media, index) => toSeasonEntry(media, index + 1))

  const rootTmdbId = await findTmdbSeriesId(root)
  
  if (rootTmdbId) {
    const tmdbDetails = await getTmdbTvDetails(rootTmdbId)
    if (tmdbDetails && tmdbDetails.seasons) {
      interface TmdbSeasonLike { season_number: number; episode_count: number }
      const tmdbSeasons = (tmdbDetails.seasons as TmdbSeasonLike[]).filter((s) => s.season_number > 0 && s.episode_count > 0)
      
      let currentTmdbIdx = 0
      let currentTmdbOffset = 0 // episodes used up in the current TMDB season

      // Map Anilist chain to TMDB seasons/offsets
      entries = entries.map(entry => {
        entry.tmdbId = rootTmdbId
        
        if (currentTmdbIdx >= tmdbSeasons.length) {
          // Out of TMDB seasons (metadata out of sync)
          entry.tmdbSeasonNumber = tmdbSeasons[tmdbSeasons.length - 1]?.season_number || 1
          entry.episodeOffset = currentTmdbOffset + 1
          return entry
        }

        const tmdbS = tmdbSeasons[currentTmdbIdx]
        entry.tmdbSeasonNumber = tmdbS.season_number
        entry.episodeOffset = currentTmdbOffset + 1

        if (entry.episodesCount) {
          currentTmdbOffset += entry.episodesCount
          // If we exceeded the episodes in this TMDB season, carry over
          // But usually we just jump to the next season for the next Anilist entry
          if (currentTmdbOffset >= tmdbS.episode_count) {
            currentTmdbIdx++
            currentTmdbOffset = 0
          }
        } else {
          // If Anilist doesn't have episode count, assume it consumes the rest of the TMDB season
          currentTmdbIdx++
          currentTmdbOffset = 0
        }

        return entry
      })

      return {
        anime: root,
        seasons: entries,
      }
    }
  }

  // Fallback if TMDB mapping fails
  return {
    anime: root,
    seasons: entries,
  }
}
