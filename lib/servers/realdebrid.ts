import type { StreamResult, ServerAdapter } from '@/types/stream'

const RD_BASE = 'https://api.real-debrid.com/rest/1.0'

async function searchMagnets(tmdbId: string, type: 'movie' | 'episode', season?: number, episode?: number): Promise<string[]> {
  // First, convert TMDB ID to IMDB ID using TMDB API
  try {
    const tmdbApiUrl = type === 'movie' 
      ? `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${process.env.TMDB_API_KEY}`
      : `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${process.env.TMDB_API_KEY}`;
    
    const extRes = await fetch(tmdbApiUrl, { signal: AbortSignal.timeout(5000) });
    if (!extRes.ok) return [];
    const extData = await extRes.json();
    
    const imdbId = extData.imdb_id;
    if (!imdbId) return [];

    // Try Torrentio/Stremio API as magnet source
    const typeStr = type === 'movie' ? 'movie' : 'series'
    const episodePart = type === 'episode' ? `:${season}:${episode}` : ''
    const stremioUrl = `https://torrentio.strem.fun/stream/${typeStr}/${imdbId}${episodePart}.json`
    
    const res = await fetch(stremioUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const data = await res.json()
    
    const magnets: string[] = []
    
    // Sort and filter streams to prefer browser-compatible formats (x264, SDR, mp4)
    // Avoid HEVC/x265, Dolby Vision (DV), and REMUX if possible unless no other options exist
    const streams = (data.streams || []).sort((a: any, b: any) => {
      const aTitle = (a.title || '').toLowerCase()
      const bTitle = (b.title || '').toLowerCase()
      
      const score = (t: string) => {
        let s = 0
        if (t.includes('x264') || t.includes('h264')) s += 50
        if (t.includes('mp4')) s += 40
        if (t.includes('1080p')) s += 30
        if (t.includes('hevc') || t.includes('x265')) s -= 50
        if (t.includes('remux') || t.includes('truehd')) s -= 40
        if (t.includes('dv') || t.includes('hdr')) s -= 30
        return s
      }
      
      return score(bTitle) - score(aTitle)
    })

    for (const stream of streams.slice(0, 4)) {
      if (stream.infoHash) {
        const magnet = `magnet:?xt=urn:btih:${stream.infoHash}&dn=${encodeURIComponent(stream.name || '')}`
        magnets.push(magnet)
      }
    }
    return magnets
  } catch {
    return []
  }
}

export const realDebridAdapter: ServerAdapter = {
  name: 'realdebrid',
  async resolve(tmdbId, type, season, episode) {
    const token = process.env.RD_API_TOKEN
    if (!token) return []

    try {
      const magnets = await searchMagnets(tmdbId, type, season, episode)
      if (!magnets.length) return []

      const results: StreamResult[] = []

      for (const magnet of magnets.slice(0, 3)) {
        try {
          // Add magnet to RD
          const addRes = await fetch(`${RD_BASE}/torrents/addMagnet`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `magnet=${encodeURIComponent(magnet)}`,
            signal: AbortSignal.timeout(8000),
          })
          if (!addRes.ok) continue
          const addData = await addRes.json()
          const torrentId = addData.id

          // Get torrent info
          const infoRes = await fetch(`${RD_BASE}/torrents/info/${torrentId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: AbortSignal.timeout(8000),
          })
          const info = await infoRes.json()

          if (!info.links || info.links.length === 0) {
            // Find the largest video file to prevent RD from returning a .rar archive
            const videoFiles = (info.files || []).filter((f: any) => 
              f.path.match(/\.(mkv|mp4|avi|mov|m4v|webm)$/i)
            )
            
            if (videoFiles.length === 0) continue
            
            // Sort by size descending
            videoFiles.sort((a: any, b: any) => b.bytes - a.bytes)
            const fileId = videoFiles[0].id

            // Select ONLY the largest video file
            await fetch(`${RD_BASE}/torrents/selectFiles/${torrentId}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `files=${fileId}`,
              signal: AbortSignal.timeout(5000),
            })
          }

          // Re-fetch info to get links
          const info2Res = await fetch(`${RD_BASE}/torrents/info/${torrentId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: AbortSignal.timeout(8000),
          })
          const info2 = await info2Res.json()

          if (!info2.links || info2.links.length === 0) continue

          // Unrestrict the first video link
          const videoLink = info2.links.find((l: string) =>
            l.match(/\.(mkv|mp4|avi|mov|m4v)(\?|$)/i)
          ) || info2.links[0]

          const unrestrictRes = await fetch(`${RD_BASE}/unrestrict/link`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `link=${encodeURIComponent(videoLink)}`,
            signal: AbortSignal.timeout(8000),
          })
          if (!unrestrictRes.ok) continue
          const unrestricted = await unrestrictRes.json()

          if (unrestricted.download) {
            const quality = unrestricted.filename?.match(/(\d{3,4}p)/i)?.[1] || 'auto'
            const rdFileName = unrestricted.filename || ''
            
            // If streamable, get transcoded HLS stream for maximum browser compatibility
            if (unrestricted.streamable === 1) {
              try {
                const streamRes = await fetch(`${RD_BASE}/streaming/transcode/${unrestricted.id}`, {
                  headers: { 'Authorization': `Bearer ${token}` },
                  signal: AbortSignal.timeout(5000),
                })
                if (streamRes.ok) {
                  const streamData = await streamRes.json()
                  if (streamData.apple?.full) {
                    results.push({
                      url: streamData.apple.full,
                      server: 'realdebrid',
                      type: 'hls',
                      isRealDebrid: true,
                      quality,
                      label: `RD Browser-Safe (HLS) ${quality}`,
                      fileName: rdFileName,
                    })
                  }
                }
              } catch (err) {
                console.error('[RD Transcode]', err)
              }
            }

            // Also provide the direct link as a fallback
            results.push({
              url: unrestricted.download,
              server: 'realdebrid',
              type: unrestricted.download.includes('.m3u8') ? 'hls' : 'mp4',
              isRealDebrid: true,
              quality,
              label: `RD Direct ${quality}`,
              fileName: rdFileName,
            })
          }
        } catch (err) {
          console.error('[RD magnet]', err)
        }
      }

      return results
    } catch (err) {
      console.error('[RealDebrid]', err)
      return []
    }
  }
}
