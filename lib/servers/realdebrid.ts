import type { StreamResult, ServerAdapter } from '@/types/stream'

// Simple in-memory cache for external IDs to avoid redundant TMDB API calls
const extIdCache = new Map<string, string>()

function isAnimeTitle(title: string): boolean {
  const indicators = /\b(anime\b|season\d|shingeki|attack on titan|naruto|one piece|demon slayer|jujutsu|kaguya|hero academia|overlord|re:zero|tokyo ghoul|death note|fullmetal|gundam|sailor moon|dragon ball|boruto|black clover|fire force|vinland|made in abyss|promised neverland|one punch man|mob psycho|food wars|haikyuu|attack.titan|jjk)/i
  return indicators.test(title)
}

async function searchMagnets(tmdbId: string, type: 'movie' | 'episode', season?: number, episode?: number): Promise<{ magnet: string; title: string }[]> {
  const cacheKey = `${type}-${tmdbId}`
  let imdbId = extIdCache.get(cacheKey)

  try {
    if (!imdbId) {
      const tmdbApiUrl = type === 'movie'
        ? `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${process.env.TMDB_API_KEY}`
        : `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${process.env.TMDB_API_KEY}`;

      const extRes = await fetch(tmdbApiUrl, { signal: AbortSignal.timeout(5000) });
      if (!extRes.ok) return [];
      const extData = await extRes.json();
      imdbId = extData.imdb_id;
      if (imdbId) extIdCache.set(cacheKey, imdbId)
    }

    if (!imdbId) return [];

    const typeStr = type === 'movie' ? 'movie' : 'series'
    const episodePart = type === 'episode' ? `:${season}:${episode}` : ''
    const stremioUrl = `https://torrentio.strem.fun/stream/${typeStr}/${imdbId}${episodePart}.json`

    const res = await fetch(stremioUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const data = await res.json()

    const magnets: { magnet: string; title: string }[] = []

    // Detect anime content from any stream title for scoring
    const anyAnime = (data.streams || []).some((s: { title?: string }) => isAnimeTitle(s.title || ''))

    const streams = (data.streams || []).sort((a: { title?: string }, b: { title?: string }) => {
      const aTitle = (a.title || '').toLowerCase()
      const bTitle = (b.title || '').toLowerCase()

      const score = (t: string) => {
        let s = 0
        if (t.includes('x264') || t.includes('h264')) s += 50
        if (t.includes('mp4')) s += 40
        if (t.includes('1080p')) s += 30

        // Strongly penalize incompatible codecs
        if (t.includes('hevc') || t.includes('x265')) s -= (anyAnime ? 200 : 100)
        if (t.includes('10bit') || t.includes('10-bit') || t.includes('hi10p')) s -= (anyAnime ? 200 : 120)
        if (t.includes('remux') || t.includes('truehd')) s -= 40
        if (t.includes('dv') || t.includes('hdr')) s -= 30
        return s
      }
      return score(bTitle) - score(aTitle)
    })

    for (const stream of streams.slice(0, 4)) {
      if (stream.infoHash) {
        const magnet = `magnet:?xt=urn:btih:${stream.infoHash}&dn=${encodeURIComponent(stream.name || '')}`
        magnets.push({ magnet, title: stream.title || stream.name || '' })
      }
    }
    return magnets
  } catch {
    return []
  }
}

const RD_BASE = 'https://api.real-debrid.com/rest/1.0'

interface RDFiles {
  id: number;
  path: string;
  bytes: number;
  selected: number;
}

function selectBestFile(
  files: RDFiles[],
  type: 'movie' | 'episode',
  season?: number,
  episode?: number,
): { file: RDFiles; totalVideoFiles: number; matchedByEpisode: boolean } {
  const videoFiles = (files || []).filter((f) =>
    f.path.match(/\.(mkv|mp4|avi|mov|m4v|webm)$/i)
  )
  if (videoFiles.length === 0) return { file: files[0], totalVideoFiles: 0, matchedByEpisode: false }
  if (videoFiles.length === 1) return { file: videoFiles[0], totalVideoFiles: 1, matchedByEpisode: false }

  if (type === 'episode' && season != null && episode != null) {
    const patterns = [
      new RegExp(`[Ss]0*${season}[Ee]0*${episode}(?![0-9])`),
      new RegExp(`0*${season}[xX]0*${episode}(?![0-9])`),
      new RegExp(`(?<![0-9])0*${season}00*${episode}(?![0-9])`),
    ]
    for (const re of patterns) {
      const matched = videoFiles.find((f) => re.test(f.path))
      if (matched) {
        return { file: matched, totalVideoFiles: videoFiles.length, matchedByEpisode: true }
      }
    }
  }

  videoFiles.sort((a, b) => b.bytes - a.bytes)
  return { file: videoFiles[0], totalVideoFiles: videoFiles.length, matchedByEpisode: false }
}

export interface RDTranscodeResult {
  apple: { full: string }
  dash: { full: string }
  liveMP4: { full: string }
  h264WebM: { full: string }
}

async function fetchTranscode(fileId: string, token: string): Promise<RDTranscodeResult | null> {
  try {
    const res = await fetch(`${RD_BASE}/streaming/transcode/${fileId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return await res.json() as RDTranscodeResult
  } catch {
    return null
  }
}

async function resolveMagnet(
  magnet: string,
  title: string,
  token: string,
  type: 'movie' | 'episode',
  season?: number,
  episode?: number,
): Promise<StreamResult[]> {
  try {
    const addRes = await fetch(`${RD_BASE}/torrents/addMagnet`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `magnet=${encodeURIComponent(magnet)}`,
      signal: AbortSignal.timeout(8000),
    })
    if (!addRes.ok) return []
    const addData = await addRes.json()
    const torrentId = addData.id

    const infoRes = await fetch(`${RD_BASE}/torrents/info/${torrentId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    })
    const info = await infoRes.json()

    if (!info.links || info.links.length === 0) {
      const { file: bestFile } = selectBestFile(
        info.files || [], type, season, episode
      )
      if (!bestFile) return []

      await fetch(`${RD_BASE}/torrents/selectFiles/${torrentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `files=${bestFile.id}`,
        signal: AbortSignal.timeout(5000),
      })

      await new Promise(r => setTimeout(r, 500))
    }

    const info2Res = await fetch(`${RD_BASE}/torrents/info/${torrentId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    })
    const info2 = await info2Res.json()
    if (!info2.links || info2.links.length === 0) return []

    let videoLink: string
    if (type === 'episode' && info2.links.length > 1 && season && episode) {
      const epPattern = new RegExp(`[Ss]0*${season}[Ee]0*${episode}`, 'i')
      const matchedLink = info2.links.find((l: string) => epPattern.test(l))
      videoLink = matchedLink || info2.links.find((l: string) =>
        l.match(/\.(mkv|mp4|avi|mov|m4v)(\?|$)/i)
      ) || info2.links[0]
    } else {
      videoLink = info2.links.find((l: string) =>
        l.match(/\.(mkv|mp4|avi|mov|m4v)(\?|$)/i)
      ) || info2.links[0]
    }

    const unrestrictRes = await fetch(`${RD_BASE}/unrestrict/link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `link=${encodeURIComponent(videoLink)}`,
      signal: AbortSignal.timeout(8000),
    })
    if (!unrestrictRes.ok) return []
    const unrestricted = await unrestrictRes.json()

    if (!unrestricted.download) return []

    const quality = unrestricted.filename?.match(/(\d{3,4}p)/i)?.[1] || 'auto'
    const rdFileName = unrestricted.filename || ''
    const rdFileId = unrestricted.id as string
    const results: StreamResult[] = []

    // If streamable, get ALL transcoded variants
    if (unrestricted.streamable === 1) {
      const streamData = await fetchTranscode(rdFileId, token)
      if (streamData) {
        // liveMP4: best for mobile Safari and speed
        if (streamData.liveMP4?.full) {
          results.push({
            url: streamData.liveMP4.full,
            server: 'realdebrid',
            type: 'mp4',
            isRealDebrid: true,
            quality,
            label: `RD LiveMP4 ${quality}`,
            fileName: rdFileName,
            rdFileId,
            rdTorrentId: torrentId,
          })
        }
        // Apple HLS: best for desktop adaptive quality
        if (streamData.apple?.full) {
          results.push({
            url: streamData.apple.full,
            server: 'realdebrid',
            type: 'hls',
            isRealDebrid: true,
            quality,
            label: `RD HLS ${quality}`,
            fileName: rdFileName,
            rdFileId,
            rdTorrentId: torrentId,
          })
        }
        // DASH: for Android
        if (streamData.dash?.full) {
          results.push({
            url: streamData.dash.full,
            server: 'realdebrid',
            type: 'dash',
            isRealDebrid: true,
            quality,
            label: `RD DASH ${quality}`,
            fileName: rdFileName,
            rdFileId,
            rdTorrentId: torrentId,
          })
        }
        // h264WebM: fallback for older browsers
        if (streamData.h264WebM?.full) {
          results.push({
            url: streamData.h264WebM.full,
            server: 'realdebrid',
            type: 'mp4', // browser handles as generic
            isRealDebrid: true,
            quality,
            label: `RD WebM ${quality}`,
            fileName: rdFileName,
            rdFileId,
            rdTorrentId: torrentId,
          })
        }
      }
    }

    // Raw download URL — only add if no transcodes available
    // NEVER use for MKV on mobile; the transcode variants above handle all cases
    if (results.length === 0) {
      results.push({
        url: unrestricted.download,
        server: 'realdebrid',
        type: unrestricted.download.includes('.m3u8') ? 'hls' : 'mp4',
        isRealDebrid: true,
        quality,
        label: `RD Direct ${quality}`,
        fileName: rdFileName,
        rdFileId,
        rdTorrentId: torrentId,
      })
    }

    return results
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

      const results = await Promise.all(
        magnets.slice(0, 3).map(m => resolveMagnet(m.magnet, m.title, token, type, season, episode))
      )
      return results.flat()
    } catch (err) {
      console.error('[RealDebrid]', err)
      return []
    }
  }
}
