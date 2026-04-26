import type { StreamResult, ServerAdapter } from '@/types/stream'

export const vidsrcAdapter: ServerAdapter = {
  name: 'vidsrc',
  async resolve(tmdbId, type, season, episode) {
    // Generate the embed URL based on the content type
    let url = ''
    if (type === 'movie') {
      url = `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
    } else {
      url = `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
    }

    // Since this is an embed, we only return one option
    const result: StreamResult = {
      url,
      server: 'vidsrc',
      type: 'embed',
      isRealDebrid: false,
      quality: 'auto',
      label: 'VidSrc (بدون إعلانات)', // Arabic label indicating ad-free if configured properly
    }

    return [result]
  }
}
