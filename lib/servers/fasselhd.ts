import type { ServerAdapter } from '@/types/stream'

// FasselHD adapter — extracts direct m3u8 from embeds server-side
export const fasselhdAdapter: ServerAdapter = {
  name: 'fasselhd',
  async resolve(tmdbId, type, season, episode) {
    try {
      const baseUrl = 'https://www.fasselhd.com'
      let searchUrl: string

      if (type === 'movie') {
        searchUrl = `${baseUrl}/?s=tmdb-${tmdbId}`
      } else {
        searchUrl = `${baseUrl}/?s=tmdb-${tmdbId}-s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`
      }

      // Search for content
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000),
      })
      const searchHtml = await searchRes.text()

      // Extract post URL
      const postMatch = searchHtml.match(/href="(https:\/\/www\.fasselhd\.com\/[^"]+)"[^>]*class="[^"]*post[^"]*"/i)
        || searchHtml.match(/<a[^>]+href="(https:\/\/www\.fasselhd\.com\/[^"?]+)"[^>]*>/i)
      if (!postMatch) return []

      // Get embed iframe
      const postRes = await fetch(postMatch[1], {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000),
      })
      const postHtml = await postRes.text()

      // Extract m3u8 directly
      const m3u8Match = postHtml.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i)
      if (m3u8Match) {
        return [{
          url: m3u8Match[0],
          server: 'fasselhd',
          type: 'hls',
          isRealDebrid: false,
          quality: 'auto',
          label: 'FasselHD',
        }]
      }

      // Look for iframe embed
      const iframeMatch = postHtml.match(/src="(https?:\/\/[^"]+player[^"]+)"/i)
        || postHtml.match(/iframe[^>]+src="(https?:\/\/[^"]+)"/i)
      if (!iframeMatch) return []

      const embedRes = await fetch(iframeMatch[1], {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': postMatch[1],
        },
        signal: AbortSignal.timeout(8000),
      })
      const embedHtml = await embedRes.text()

      const embedM3u8 = embedHtml.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i)
        || embedHtml.match(/"file"\s*:\s*"(https?:\/\/[^"]+)"/i)
      if (!embedM3u8) return []

      return [{
        url: embedM3u8[1] || embedM3u8[0],
        server: 'fasselhd',
        type: 'hls',
        isRealDebrid: false,
        quality: 'auto',
        label: 'FasselHD',
      }]
    } catch (err) {
      console.error('[FasselHD]', err)
      return []
    }
  }
}
