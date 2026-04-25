import type { ServerAdapter } from '@/types/stream'

async function extractM3u8FromEmbed(embedUrl: string, referer: string): Promise<string | null> {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
      },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    
    const m3u8 = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i)
    if (m3u8) return m3u8[0]
    
    const fileMatch = html.match(/"file"\s*:\s*"(https?:\/\/[^"]+)"/i)
    if (fileMatch) return fileMatch[1]
    
    const sourceMatch = html.match(/source\s*:\s*"(https?:\/\/[^"]+)"/i)
    if (sourceMatch) return sourceMatch[1]
    
    return null
  } catch {
    return null
  }
}

// VidBom adapter
export const vidbomAdapter: ServerAdapter = {
  name: 'vidbom',
  async resolve(tmdbId, type, season, episode) {
    try {
      const path = type === 'movie'
        ? `/movie/${tmdbId}`
        : `/tv/${tmdbId}/${season}/${episode}`
      
      const embedUrl = `https://vidbom.com/embed${path}`
      const url = await extractM3u8FromEmbed(embedUrl, 'https://vidbom.com')
      if (!url) return []
      
      return [{ url, server: 'vidbom', type: 'hls', isRealDebrid: false, quality: 'auto', label: 'VidBom' }]
    } catch {
      return []
    }
  }
}

// Doodstream adapter
export const doodstreamAdapter: ServerAdapter = {
  name: 'doodstream',
  async resolve(tmdbId, type, season, episode) {
    try {
      const path = type === 'movie'
        ? `/movie/${tmdbId}`
        : `/tv/${tmdbId}-${season}-${episode}`
      
      const embedUrl = `https://dood.la/e${path}`
      const url = await extractM3u8FromEmbed(embedUrl, 'https://dood.la')
      if (!url) return []
      
      return [{ url, server: 'doodstream', type: 'hls', isRealDebrid: false, quality: 'auto', label: 'DoodStream' }]
    } catch {
      return []
    }
  }
}

// StreamWish adapter
export const streamwishAdapter: ServerAdapter = {
  name: 'streamwish',
  async resolve(tmdbId, type, season, episode) {
    try {
      const path = type === 'movie'
        ? `/movie/${tmdbId}`
        : `/tv/${tmdbId}/${season}/${episode}`
      
      const embedUrl = `https://streamwish.com/e${path}`
      const url = await extractM3u8FromEmbed(embedUrl, 'https://streamwish.com')
      if (!url) return []
      
      return [{ url, server: 'streamwish', type: 'hls', isRealDebrid: false, quality: 'auto', label: 'StreamWish' }]
    } catch {
      return []
    }
  }
}

// FileMoon adapter
export const filemoonAdapter: ServerAdapter = {
  name: 'filemoon',
  async resolve(tmdbId, type, season, episode) {
    try {
      const path = type === 'movie'
        ? `/movie/${tmdbId}`
        : `/tv/${tmdbId}/${season}/${episode}`
      
      const embedUrl = `https://filemoon.sx/e${path}`
      const url = await extractM3u8FromEmbed(embedUrl, 'https://filemoon.sx')
      if (!url) return []
      
      return [{ url, server: 'filemoon', type: 'hls', isRealDebrid: false, quality: 'auto', label: 'FileMoon' }]
    } catch {
      return []
    }
  }
}
