import { NextResponse } from 'next/server'

// ─── Scoring weights ───
// The goal: find the subtitle that is PERFECTLY synced with the audio.
// Subtitles are made for specific video releases (BluRay, WEB-DL, HDTV, etc.)
// If we match the release group/tags to the stream filename, sync is near-perfect.
const SCORE = {
  RELEASE_MATCH:       15,  // Subtitle filename matches stream release tags
  RESOLUTION_MATCH:    5,   // Resolution matches (1080p, 720p, etc.)
  HI_PENALTY:         -3,   // Hearing-impaired subs have [sounds] that hurt sync feel
  MACHINE_TRANSLATED: -10,  // Machine translations are almost always out of sync
  DOWNLOAD_PER_500:    1,   // Community trust: more downloads = more verified
  DOWNLOAD_CAP:        5,   // Max points from downloads
  RATING_MULTIPLIER:   3,   // Direct quality rating
  SOURCE_SUBDL:        3,   // SubDL tends to have well-synced Arabic subs
  SOURCE_STREMIO:      2,   // Stremio legacy DB is reliable
  SOURCE_OPENSUBS:     1,   // OpenSubtitles REST is good but generic
  TRUSTED_UPLOADER:    2,   // Known good uploaders
  HASH_MATCH:          20,  // Perfect hash match (if available)
}

// Release tags used to match subtitles to specific video files
const RELEASE_TAGS = [
  'bluray', 'bdrip', 'brrip', 'webrip', 'web-dl', 'webdl', 'web',
  'hdtv', 'hdcam', 'hdrip', 'dvdrip', 'dvdscr', 'ts', 'cam',
  'amzn', 'nf', 'netflix', 'hulu', 'dsnp', 'disney', 'atvp', 'apple',
  'hmax', 'max', 'pcok', 'peacock', 'paramount',
  'x264', 'x265', 'h264', 'h265', 'hevc', 'avc',
  'aac', 'ac3', 'dts', 'atmos', 'eac3',
  'yts', 'rarbg', 'sparks', 'fleet', 'pahe', 'psa', 'qxr',
  'ntb', 'cmrg', 'eztv', 'lol', 'dimension', 'ion10',
  'yify', 'tigole', 'mkvcage', 'sujaidr',
]

const RESOLUTION_TAGS = ['2160p', '4k', '1080p', '720p', '480p', '360p']

function extractTags(filename: string): string[] {
  if (!filename) return []
  const lower = filename.toLowerCase().replace(/[._\-\[\]()]/g, ' ')
  const words = lower.split(/\s+/)
  return words.filter(w => [...RELEASE_TAGS, ...RESOLUTION_TAGS].includes(w))
}

function extractResolution(text: string): string | null {
  if (!text) return null
  const lower = text.toLowerCase()
  for (const res of RESOLUTION_TAGS) {
    if (lower.includes(res)) return res
  }
  return null
}

interface RawSubtitle {
  id: string
  fileId: string
  fileName: string
  language: string
  downloadCount: number
  rating: number
  uploaderName: string
  source: string
  isHearingImpaired?: boolean
  isMachineTranslated?: boolean
  releaseName?: string
}

function scoreSub(sub: RawSubtitle, streamFileName: string): number {
  let score = 0

  // 1. Release tag matching — THE MOST IMPORTANT FACTOR for lip sync
  const subTags = extractTags(sub.fileName || sub.releaseName || '')
  const streamTags = extractTags(streamFileName || '')
  
  if (subTags.length > 0 && streamTags.length > 0) {
    const matchCount = subTags.filter(t => streamTags.includes(t)).length
    const matchRatio = matchCount / Math.max(streamTags.length, 1)
    score += Math.round(matchRatio * SCORE.RELEASE_MATCH)
  }

  // 2. Resolution match
  const subRes = extractResolution(sub.fileName || sub.releaseName || '')
  const streamRes = extractResolution(streamFileName || '')
  if (subRes && streamRes && subRes === streamRes) {
    score += SCORE.RESOLUTION_MATCH
  }

  // 3. Hearing impaired penalty
  if (sub.isHearingImpaired) {
    score += SCORE.HI_PENALTY
  }

  // 4. Machine translated — hard penalty
  if (sub.isMachineTranslated) {
    score += SCORE.MACHINE_TRANSLATED
  }

  // 5. Download count — capped community trust
  const dlScore = Math.min(
    Math.floor((sub.downloadCount || 0) / 500) * SCORE.DOWNLOAD_PER_500,
    SCORE.DOWNLOAD_CAP
  )
  score += dlScore

  // 6. Rating
  if (sub.rating && sub.rating > 0) {
    score += Math.round(sub.rating * SCORE.RATING_MULTIPLIER)
  }

  // 7. Source priority
  if (sub.source === 'subdl') score += SCORE.SOURCE_SUBDL
  else if (sub.source === 'stremio') score += SCORE.SOURCE_STREMIO
  else if (sub.source === 'opensubtitles') score += SCORE.SOURCE_OPENSUBS

  return score
}

// ─── GET: Search subtitles ───
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type') || 'movie'
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')
  const language = searchParams.get('language') || 'ar'
  const streamFile = searchParams.get('streamFile') || '' // stream filename for matching

  if (!tmdbId) return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 })

  const TMDB_KEY = process.env.TMDB_API_KEY
  const OS_API_KEY = process.env.OPENSUBTITLES_API_KEY
  const SUBDL_KEY = process.env.SUBDL_API_KEY

  if (!TMDB_KEY) return NextResponse.json({ subtitles: [] })

  try {
    // ── Step 1: Get IMDB ID for Stremio ──
    const extRes = await fetch(
      `https://api.themoviedb.org/3/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}/external_ids?api_key=${TMDB_KEY}`
    )
    const extData = await extRes.json()
    const imdbId = extData.imdb_id

    // ── Step 2: Fetch from ALL sources in parallel ──
    const [stremioSubs, restSubs, subdlSubs] = await Promise.all([
      fetchStremio(imdbId, type, season, episode, language),
      fetchOpenSubtitles(tmdbId, type, season, episode, language, OS_API_KEY),
      fetchSubDL(tmdbId, type, season, episode, language, SUBDL_KEY),
    ])

    // ── Step 3: Combine and deduplicate ──
    let allSubs = [...stremioSubs, ...restSubs, ...subdlSubs]
    
    // Deduplicate by similar filenames
    const seen = new Set<string>()
    allSubs = allSubs.filter(sub => {
      const key = (sub.fileName || sub.id).toLowerCase().replace(/\s+/g, '')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // ── Step 4: Score and rank ──
    const scored = allSubs.map(sub => ({
      ...sub,
      syncScore: scoreSub(sub, streamFile),
    }))

    // Sort by syncScore descending (best match first)
    scored.sort((a, b) => b.syncScore - a.syncScore)

    // Convert to the client-expected format
    const subtitles = scored.map(s => ({
      id: s.id,
      fileId: s.fileId,
      fileName: s.fileName,
      language: s.language,
      downloadCount: s.downloadCount,
      rating: s.rating,
      uploaderName: s.uploaderName,
      syncScore: s.syncScore,
      source: s.source,
    }))

    // ── Step 5: If no Arabic subs found, try English fallback ──
    if (subtitles.length === 0 && language === 'ar') {
      const [enStremio, enRest, enSubdl] = await Promise.all([
        fetchStremio(imdbId, type, season, episode, 'en'),
        fetchOpenSubtitles(tmdbId, type, season, episode, 'en', OS_API_KEY),
        fetchSubDL(tmdbId, type, season, episode, 'en', SUBDL_KEY),
      ])

      let enSubs = [...enStremio, ...enRest, ...enSubdl]
      const enSeen = new Set<string>()
      enSubs = enSubs.filter(sub => {
        const key = (sub.fileName || sub.id).toLowerCase().replace(/\s+/g, '')
        if (enSeen.has(key)) return false
        enSeen.add(key)
        return true
      })

      const enScored = enSubs.map(sub => ({
        ...sub,
        syncScore: scoreSub(sub, streamFile),
      }))
      enScored.sort((a, b) => b.syncScore - a.syncScore)

      const enSubtitles = enScored.slice(0, 15).map(s => ({
        id: s.id,
        fileId: s.fileId,
        fileName: s.fileName,
        language: 'en',
        downloadCount: s.downloadCount,
        rating: s.rating,
        uploaderName: `${s.uploaderName} (EN Fallback)`,
        syncScore: s.syncScore,
        source: s.source,
      }))

      return NextResponse.json({ subtitles: enSubtitles, fallbackLanguage: 'en' }, {
        headers: { 'Cache-Control': 'public, s-maxage=1800' },
      })
    }

    return NextResponse.json({ subtitles: subtitles.slice(0, 20) }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800' },
    })
  } catch (error) {
    console.error('[Subtitles]', error)
    return NextResponse.json({ subtitles: [] })
  }
}

// ─── Source 1: Stremio OpenSubtitles v3 (Legacy DB) ───
async function fetchStremio(
  imdbId: string | null, type: string, season: string | null,
  episode: string | null, language: string
): Promise<RawSubtitle[]> {
  if (!imdbId) return []
  try {
    const stremioType = type === 'movie' ? 'movie' : 'series'
    const stremioId = type === 'movie' ? imdbId : `${imdbId}:${season}:${episode}`
    const langCode = language === 'ar' ? 'ara' : language === 'en' ? 'eng' : language
    
    const res = await fetch(
      `https://opensubtitles-v3.strem.io/subtitles/${stremioType}/${stremioId}/${langCode}.json`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    
    const data = await res.json()
    if (!data.subtitles) return []
    
    return data.subtitles
      .filter((s: any) => s.lang === langCode)
      .map((s: any) => ({
        id: `stremio-${s.id}`,
        fileId: s.url,
        fileName: s.SubFileName || s.id + '.srt',
        language,
        downloadCount: s.SubDownloadsCnt ? parseInt(s.SubDownloadsCnt) : 5000,
        rating: s.SubRating ? parseFloat(s.SubRating) : 0,
        uploaderName: 'Stremio',
        source: 'stremio',
        isHearingImpaired: s.SubHearingImpaired === '1',
        isMachineTranslated: false,
        releaseName: s.MovieReleaseName || s.SubFileName || '',
      }))
  } catch (err) {
    console.error('[Stremio Subs]', err)
    return []
  }
}

// ─── Source 2: OpenSubtitles REST API v1 ───
async function fetchOpenSubtitles(
  tmdbId: string, type: string, season: string | null,
  episode: string | null, language: string, apiKey: string | undefined
): Promise<RawSubtitle[]> {
  if (!apiKey) return []
  try {
    const params = new URLSearchParams({
      tmdb_id: tmdbId,
      languages: language,
      type: type === 'movie' ? 'movie' : 'episode',
      ...(season && { season_number: season }),
      ...(episode && { episode_number: episode }),
    })

    const res = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${params}`, {
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Mashhad v1.0',
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) return []
    const data = await res.json()
    
    return (data.data || []).slice(0, 15).map((item: any) => ({
      id: `os-${item.id}`,
      fileId: item.attributes.files[0]?.file_id?.toString() || item.id,
      fileName: item.attributes.files[0]?.file_name || item.attributes.release || '',
      language: item.attributes.language,
      downloadCount: item.attributes.download_count || 0,
      rating: item.attributes.ratings || 0,
      uploaderName: item.attributes.uploader?.name || 'OpenSubtitles',
      source: 'opensubtitles',
      isHearingImpaired: item.attributes.hearing_impaired || false,
      isMachineTranslated: item.attributes.machine_translated || false,
      releaseName: item.attributes.release || '',
    }))
  } catch (err) {
    console.error('[OpenSubs REST]', err)
    return []
  }
}

// ─── Source 3: SubDL API ───
async function fetchSubDL(
  tmdbId: string, type: string, season: string | null,
  episode: string | null, language: string, apiKey: string | undefined
): Promise<RawSubtitle[]> {
  if (!apiKey) return []
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      tmdb_id: tmdbId,
      type: type === 'movie' ? 'movie' : 'tv',
      languages: language,
      subs_per_page: '30',
      ...(season && { season_number: season }),
      ...(episode && { episode_number: episode }),
    })

    const res = await fetch(`https://api.subdl.com/auto?${params}`, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error('[SubDL] Response not ok:', res.status)
      return []
    }

    const data = await res.json()
    if (!data.subtitles || !Array.isArray(data.subtitles)) return []

    return data.subtitles.map((item: any) => ({
      id: `subdl-${item.release_name || item.name || Math.random()}`,
      fileId: item.url ? `https://dl.subdl.com${item.url}` : '',
      fileName: item.release_name || item.name || '',
      language: language,
      downloadCount: item.download_count || 0,
      rating: item.rating || 0,
      uploaderName: item.author || 'SubDL',
      source: 'subdl',
      isHearingImpaired: item.hi === true || item.hearing_impaired === true,
      isMachineTranslated: item.ai_translated === true || item.machine_translated === true,
      releaseName: item.release_name || '',
    }))
  } catch (err) {
    console.error('[SubDL]', err)
    return []
  }
}

// ─── POST: Download and convert subtitle to VTT ───
export async function POST(request: Request) {
  const API_KEY = process.env.OPENSUBTITLES_API_KEY
  const { fileId } = await request.json()
  if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 })

  try {
    let downloadLink = ''

    if (fileId.toString().startsWith('http')) {
      // Direct URL (Stremio or SubDL)
      downloadLink = fileId
    } else {
      // OpenSubtitles file ID — needs download endpoint
      if (!API_KEY) return NextResponse.json({ error: 'No API key' }, { status: 500 })
      
      const res = await fetch('https://api.opensubtitles.com/api/v1/download', {
        method: 'POST',
        headers: {
          'Api-Key': API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'Mashhad v1.0',
        },
        body: JSON.stringify({ file_id: parseInt(fileId) }),
      })

      if (!res.ok) return NextResponse.json({ error: 'Download failed' }, { status: 400 })
      const data = await res.json()
      downloadLink = data.link
    }

    // Handle SubDL zip files
    if (downloadLink.includes('dl.subdl.com')) {
      return await handleSubDLDownload(downloadLink)
    }

    // Fetch the actual SRT content
    const srtRes = await fetch(downloadLink)
    const buffer = await srtRes.arrayBuffer()
    
    // Decode with smart encoding detection
    let srtContent = decodeSubtitleBuffer(buffer, downloadLink)
    const vttContent = srtToVtt(srtContent)

    return NextResponse.json({ vttContent, downloadUrl: downloadLink })
  } catch (err) {
    console.error('[Sub Download]', err)
    return NextResponse.json({ error: 'Failed to download subtitle' }, { status: 500 })
  }
}

// ─── Handle SubDL zip downloads ───
async function handleSubDLDownload(url: string): Promise<NextResponse> {
  try {
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    
    // SubDL returns zip files — we need to extract the SRT
    // Use a simple zip parser (PKZip local file header)
    const bytes = new Uint8Array(buffer)
    const srtContent = extractSrtFromZip(bytes)
    
    if (!srtContent) {
      return NextResponse.json({ error: 'No SRT found in zip' }, { status: 400 })
    }

    const vttContent = srtToVtt(srtContent)
    return NextResponse.json({ vttContent, downloadUrl: url })
  } catch (err) {
    console.error('[SubDL Zip]', err)
    return NextResponse.json({ error: 'Failed to extract subtitle' }, { status: 500 })
  }
}

// ─── Simple ZIP extractor for SRT/ASS/VTT files ───
function extractSrtFromZip(data: Uint8Array): string | null {
  // Look for PKZip local file headers (0x04034b50)
  const files: { name: string; content: Uint8Array }[] = []
  let offset = 0

  while (offset < data.length - 4) {
    // Check for local file header signature
    if (data[offset] === 0x50 && data[offset + 1] === 0x4B &&
        data[offset + 2] === 0x03 && data[offset + 3] === 0x04) {
      
      const compressionMethod = data[offset + 8] | (data[offset + 9] << 8)
      const compressedSize = data[offset + 18] | (data[offset + 19] << 8) |
                             (data[offset + 20] << 16) | (data[offset + 21] << 24)
      const fileNameLen = data[offset + 26] | (data[offset + 27] << 8)
      const extraFieldLen = data[offset + 28] | (data[offset + 29] << 8)
      
      const nameStart = offset + 30
      const nameBytes = data.slice(nameStart, nameStart + fileNameLen)
      const fileName = new TextDecoder().decode(nameBytes)
      
      const dataStart = nameStart + fileNameLen + extraFieldLen
      
      // Only handle stored (uncompressed) files for now
      if (compressionMethod === 0 && compressedSize > 0) {
        const fileContent = data.slice(dataStart, dataStart + compressedSize)
        files.push({ name: fileName, content: fileContent })
      }
      
      offset = dataStart + compressedSize
    } else {
      offset++
    }
  }

  // Prioritize: .srt > .ass > .vtt
  const srtFile = files.find(f => f.name.toLowerCase().endsWith('.srt'))
  const assFile = files.find(f => f.name.toLowerCase().endsWith('.ass'))
  const vttFile = files.find(f => f.name.toLowerCase().endsWith('.vtt'))
  
  const target = srtFile || assFile || vttFile
  if (!target) return null
  
  // Try UTF-8 first, fallback to Windows-1256 for Arabic
  let content = new TextDecoder('utf-8').decode(target.content)
  const badChars = (content.match(/\uFFFD/g) || []).length
  if (badChars > 10) {
    content = new TextDecoder('windows-1256').decode(target.content)
  }
  
  return content
}

// ─── Smart encoding detection ───
function decodeSubtitleBuffer(buffer: ArrayBuffer, url: string): string {
  let content = new TextDecoder('utf-8').decode(buffer)
  
  const badCharsCount = (content.match(/\uFFFD/g) || []).length
  if (badCharsCount > 20 && !url.includes('utf8')) {
    content = new TextDecoder('windows-1256').decode(buffer)
  }
  
  return content
}

// ─── SRT to VTT converter ───
function srtToVtt(srt: string, offsetMs = 0): string {
  const addOffset = (time: string, offset: number) => {
    const [hms, ms] = time.split(',')
    const [h, m, s] = hms.split(':').map(Number)
    let totalMs = (h * 3600000 + m * 60000 + s * 1000 + parseInt(ms)) + offset
    totalMs = Math.max(0, totalMs)
    const nh = Math.floor(totalMs / 3600000)
    const nm = Math.floor((totalMs % 3600000) / 60000)
    const ns = Math.floor((totalMs % 60000) / 1000)
    const nms = totalMs % 1000
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}:${String(ns).padStart(2, '0')}.${String(nms).padStart(3, '0')}`
  }

  const vtt = srt
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .replace(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/g, (_, s, e) => {
      if (offsetMs === 0) return `${s} --> ${e}`
      return `${addOffset(s.replace('.', ','), offsetMs)} --> ${addOffset(e.replace('.', ','), offsetMs)}`
    })
    .replace(/^\d+$/gm, '')
    .trim()

  return `WEBVTT\n\nSTYLE\n::cue {\n  background: rgba(0,0,0,0.75);\n  color: white;\n  font-size: 1.3em;\n  line-height: 1.4;\n  padding: 4px 8px;\n  border-radius: 4px;\n}\n\n${vtt}`
}
