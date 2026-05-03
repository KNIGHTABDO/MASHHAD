import type { StreamResult, ServerAdapter } from '@/types/stream'
import { tmdb } from '@/lib/tmdb/client'

export const playimdbAdapter: ServerAdapter = {
  name: 'playimdb',
  async resolve(tmdbId, type, season, episode) {
    try {
      // Get the IMDB ID (tt1234567) from TMDB
      let imdbId = ''
      
      if (type === 'movie') {
        const detail = await tmdb.movie(tmdbId)
        imdbId = detail.imdb_id
      } else {
        const externalIds = await tmdb.externalIds('tv', tmdbId)
        imdbId = externalIds.imdb_id
      }

      if (!imdbId) return []

      let url = ''
      if (type === 'movie') {
        url = `https://streamimdb.ru/embed/movie/${imdbId}?autoplay=1&mute=0`
      } else {
        // TV structure: /embed/tv/{imdbId}/{season}/{episode}
        url = `https://streamimdb.ru/embed/tv/${imdbId}/${season}/${episode}?autoplay=1&mute=0`
      }

      const result: StreamResult = {
        url,
        server: 'playimdb',
        type: 'embed',
        isRealDebrid: false,
        quality: '1080p',
        label: 'PlayIMDb (Premium)',
        verifiedMatch: true,
      }

      return [result]
    } catch (error) {
      console.error('PlayIMDb resolution error:', error)
      return []
    }
  }
}
