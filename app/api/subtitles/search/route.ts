import { NextResponse } from 'next/server'
import { unzipSync } from 'fflate'
import { createClient } from '@/lib/supabase/server'

// Allowlist of legitimate subtitle CDN hostnames (SSRF protection)
const ALLOWED_SUBTITLE_HOSTS = [
  'dl.subdl.com',
  'opensubtitles.com',
  'opensubtitles.org',
  'opensubtitles-v3.strem.io',
  'api.opensubtitles.com',
  'subs.smu.dk',
  'subscene.com',
]

// ─── Scoring weights ───
// The ONLY way to get perfect lip sync is to find the subtitle that was
// made for the EXACT SAME video release you are watching.
// e.g. if you watch "Movie.2024.1080p.WEB-DL.DDP5.1.x264-NTb.mkv",
// the subtitle "Movie.2024.1080p.WEB-DL.DDP5.1.x264-NTb.srt" will be PERFECT.
const SCORE = {
  RELEASE_GROUP_MATCH: 20,  // Same release group (NTb, FLUX, etc.) = almost guaranteed sync
  RELEASE_MATCH:       15,  // Release tags overlap (WEB-DL, x264, etc.)
  RESOLUTION_MATCH:    5,   // Same resolution
  HI_PENALTY:         -3,   // Hearing-impaired tags hurt feel
  MACHINE_TRANSLATED: -10,  // Machine translations are out of sync
  DOWNLOAD_PER_1000:   1,   // Community trust
  DOWNLOAD_CAP:        5,   // Max points from downloads
  RATING_MULTIPLIER:   3,   // Direct quality rating
  SOURCE_SUBDL:        2,   // SubDL has great Arabic coverage
  SOURCE_OPENSUBS:     1,   // OpenSubtitles broad catalog
  SOURCE_STREMIO:      0,   // Stremio has NO metadata, can't judge quality
}

// Release groups known for quality subtitle matching
const RELEASE_GROUPS = [
  'ntb', 'flux', 'cmrg', 'eztv', 'lol', 'dimension', 'ion10',
  'yts', 'yify', 'rarbg', 'sparks', 'fleet', 'pahe', 'psa', 'qxr',
  'tigole', 'mkvcage', 'sujaidr', 'epsilon', 'tbs', 'gossip',
  'mkvcinemas', 'galaxy', 'ethel', 'mixed', 'evo', 'fgt',
  'mtb', 'btn', 'phoenix', 'dread', 'cakes', 'hone', 'monkee',
  'nfx', 'succubus', 'edith', 'kogi', 'tommy', 'ggez', 'ggwp',
  'playweb', 'peculate', 'groupb', 'xebec', 'smurf',
]

const SOURCE_TAGS = [
  'bluray', 'bdrip', 'brrip', 'webrip', 'web-dl', 'webdl', 'web',
  'hdtv', 'hdcam', 'hdrip', 'dvdrip', 'dvdscr',
  'amzn', 'nf', 'netflix', 'hulu', 'dsnp', 'disney', 'atvp', 'apple',
  'hmax', 'max', 'pcok', 'peacock', 'paramount',
]

const CODEC_TAGS = [
  'x264', 'x265', 'h264', 'h265', 'hevc', 'avc',
  'aac', 'ac3', 'dts', 'atmos', 'eac3', 'ddp5', 'dd5',
]

const RESOLUTION_TAGS = ['2160p', '4k', '1080p', '720p', '480p']

function normalizeFilename(fn: string): string {
  if (!fn) return ''
  return fn.toLowerCase()
    .replace(/\.[^.]+$/, '')         // remove extension
    .replace(/[._\-\[\](){}]/g, ' ') // normalize separators
    .replace(/\s+/g, ' ')
    .trim()
}

function extractGroup(filename: string): string | null {
  const norm = normalizeFilename(filename)
  const words = norm.split(' ')
  const last = words[words.length - 1]
  if (RELEASE_GROUPS.includes(last)) return last
  // Also check second-to-last (sometimes there's a tag after group)
  if (words.length > 1 && RELEASE_GROUPS.includes(words[words.length - 2])) return words[words.length - 2]
  return null
}

function extractAllTags(filename: string): Set<string> {
  const norm = normalizeFilename(filename)
  const words = norm.split(' ')
  const tags = new Set<string>()
  for (const w of words) {
    if (SOURCE_TAGS.includes(w) || CODEC_TAGS.includes(w) || RESOLUTION_TAGS.includes(w)) {
      tags.add(w)
    }
    // Handle "web dl" as "web-dl"
    if (w === 'web' && words.includes('dl')) tags.add('web-dl')
  }
  return tags
}

function extractResolution(text: string): string | null {
  const lower = (text || '').toLowerCase()
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
  const subName = sub.fileName || sub.releaseName || ''

  // If no stream filename, we can't do release matching — just use metadata
  if (!streamFileName) {
    // Only metadata-based scoring
    if (sub.isHearingImpaired) score += SCORE.HI_PENALTY
    if (sub.isMachineTranslated) score += SCORE.MACHINE_TRANSLATED
    const dlScore = Math.min(Math.floor((sub.downloadCount || 0) / 1000), SCORE.DOWNLOAD_CAP)
    score += dlScore
    if (sub.rating > 0) score += Math.round(sub.rating * SCORE.RATING_MULTIPLIER)
    if (sub.source === 'subdl') score += SCORE.SOURCE_SUBDL
    else if (sub.source === 'opensubtitles') score += SCORE.SOURCE_OPENSUBS
    return score
  }

  // 1. RELEASE GROUP MATCH — strongest sync signal
  const subGroup = extractGroup(subName)
  const streamGroup = extractGroup(streamFileName)
  if (subGroup && streamGroup && subGroup === streamGroup) {
    score += SCORE.RELEASE_GROUP_MATCH
  }

  // 2. Release tags overlap
  const subTags = extractAllTags(subName)
  const streamTags = extractAllTags(streamFileName)
  if (subTags.size > 0 && streamTags.size > 0) {
    let matches = 0
    for (const t of subTags) {
      if (streamTags.has(t)) matches++
    }
    const ratio = matches / Math.max(streamTags.size, 1)
    score += Math.round(ratio * SCORE.RELEASE_MATCH)
  }

  // 3. Resolution match
  const subRes = extractResolution(subName)
  const streamRes = extractResolution(streamFileName)
  if (subRes && streamRes && subRes === streamRes) {
    score += SCORE.RESOLUTION_MATCH
  }

  // 4. Penalties
  if (sub.isHearingImpaired) score += SCORE.HI_PENALTY
  if (sub.isMachineTranslated) score += SCORE.MACHINE_TRANSLATED

  // 5. Community trust (capped)
  const dlScore = Math.min(Math.floor((sub.downloadCount || 0) / 1000), SCORE.DOWNLOAD_CAP)
  score += dlScore

  // 6. Rating
  if (sub.rating > 0) score += Math.round(sub.rating * SCORE.RATING_MULTIPLIER)

  // 7. Source priority
  if (sub.source === 'subdl') score += SCORE.SOURCE_SUBDL
  else if (sub.source === 'opensubtitles') score += SCORE.SOURCE_OPENSUBS
  else if (sub.source === 'stremio') score += SCORE.SOURCE_STREMIO

  return score
}

// ─── GET: Search subtitles ───
export async function GET(request: Request) {
  // Auth check — prevents burning OpenSubtitles + SubDL quota for unauthenticated users
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ subtitles: [] }, { status: 401 })
  } catch {
    return NextResponse.json({ subtitles: [] }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type') || 'movie'
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')
  const language = searchParams.get('language') || 'ar'
  const streamFile = searchParams.get('streamFile') || ''

  if (!tmdbId) return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 })

  const TMDB_KEY = process.env.TMDB_API_KEY
  const OS_API_KEY = process.env.OPENSUBTITLES_API_KEY
  const SUBDL_KEY = process.env.SUBDL_API_KEY

  if (!TMDB_KEY) return NextResponse.json({ subtitles: [] })

  try {
    // Get IMDB ID for Stremio
    const extRes = await fetch(
      `https://api.themoviedb.org/3/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}/external_ids?api_key=${TMDB_KEY}`
    )
    const extData = await extRes.json()
    const imdbId = extData.imdb_id

    console.log(`[Subtitles] Searching for ${tmdbId} (${imdbId}), stream: "${streamFile}"`)

    // Fetch from ALL sources in parallel
    const [stremioSubs, restSubs, subdlSubs] = await Promise.all([
      fetchStremio(imdbId, type, season, episode, language),
      fetchOpenSubtitles(tmdbId, type, season, episode, language, OS_API_KEY),
      fetchSubDL(tmdbId, type, season, episode, language, SUBDL_KEY),
    ])

    console.log(`[Subtitles] Found: Stremio=${stremioSubs.length}, OpenSubs=${restSubs.length}, SubDL=${subdlSubs.length}`)

    // Combine and deduplicate
    let allSubs = [...stremioSubs, ...restSubs, ...subdlSubs]
    const seen = new Set<string>()
    allSubs = allSubs.filter(sub => {
      const key = (sub.fileName || sub.id).toLowerCase().replace(/\s+/g, '').substring(0, 60)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Score and rank
    const scored = allSubs.map(sub => {
      const syncScore = scoreSub(sub, streamFile)
      return { ...sub, syncScore }
    })
    scored.sort((a, b) => b.syncScore - a.syncScore)

    // Log top 3 for debugging
    scored.slice(0, 3).forEach((s, i) => {
      console.log(`[Subtitles] #${i + 1}: score=${s.syncScore} src=${s.source} file="${s.fileName?.substring(0, 60)}"`)
    })

    const subtitles = scored.slice(0, 25).map(s => ({
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

    // English fallback if no Arabic found
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
      const enScored = enSubs.map(sub => ({ ...sub, syncScore: scoreSub(sub, streamFile) }))
      enScored.sort((a, b) => b.syncScore - a.syncScore)
      return NextResponse.json({
        subtitles: enScored.slice(0, 15).map(s => ({
          id: s.id, fileId: s.fileId, fileName: s.fileName, language: 'en',
          downloadCount: s.downloadCount, rating: s.rating,
          uploaderName: `${s.uploaderName} (EN)`, syncScore: s.syncScore, source: s.source,
        })),
        fallbackLanguage: 'en',
      })
    }

    return NextResponse.json({ subtitles })
  } catch (error) {
    console.error('[Subtitles]', error)
    return NextResponse.json({ subtitles: [] })
  }
}

// ─── Source 1: Stremio (minimal metadata — id, url, lang only) ───
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

    // Stremio API returns ONLY: id, url, SubEncoding, lang, m, g
    // NO filename, NO download count, NO rating — we can't judge quality
    return data.subtitles
      .filter((s: any) => s.lang === langCode)
      .slice(0, 10)
      .map((s: any) => ({
        id: `stremio-${s.id}`,
        fileId: s.url,
        fileName: '',  // Stremio provides NO filename
        language,
        downloadCount: 0,   // Unknown
        rating: 0,          // Unknown
        uploaderName: `Stremio #${s.id.slice(-4)}`,
        source: 'stremio',
        isHearingImpaired: false,
        isMachineTranslated: false,
        releaseName: '',
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
      order_by: 'download_count',
      order_direction: 'desc',
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

    return (data.data || []).slice(0, 20).map((item: any) => ({
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

    const res = await fetch(`https://api.subdl.com/api/v1/subtitles?${params}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      console.error('[SubDL] HTTP', res.status)
      return []
    }
    const data = await res.json()
    if (!data.subtitles || !Array.isArray(data.subtitles)) return []

    return data.subtitles.map((item: any) => ({
      id: `subdl-${item.release_name || item.name || Math.random()}`,
      fileId: item.url ? `https://dl.subdl.com${item.url}` : '',
      fileName: item.release_name || item.name || '',
      language,
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
  // Auth check
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Auth error' }, { status: 401 })
  }

  const API_KEY = process.env.OPENSUBTITLES_API_KEY
  const { fileId } = await request.json()
  if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 })

  try {
    let downloadLink = ''

    if (fileId.toString().startsWith('http')) {
      // SSRF protection: validate the URL against allowlisted subtitle CDN hostnames
      try {
        const url = new URL(fileId.toString())
        const isAllowed = ALLOWED_SUBTITLE_HOSTS.some(host =>
          url.hostname === host || url.hostname.endsWith('.' + host)
        )
        if (!isAllowed) {
          console.warn('[Subtitle POST] Blocked SSRF attempt to:', url.hostname)
          return NextResponse.json({ error: 'URL not allowed' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
      }
      downloadLink = fileId
    } else {
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

    // SubDL returns ZIP files — use fflate to decompress
    if (downloadLink.includes('subdl.com') && downloadLink.includes('.zip')) {
      return await handleSubDLDownload(downloadLink)
    }

    // Fetch the SRT content
    const srtRes = await fetch(downloadLink)
    const buffer = await srtRes.arrayBuffer()
    const srtContent = decodeSubtitleBuffer(buffer)
    const vttContent = srtToVtt(srtContent)
    return NextResponse.json({ vttContent })
  } catch (err) {
    console.error('[Sub Download]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// ─── Handle SubDL zip downloads with fflate ───
async function handleSubDLDownload(url: string): Promise<NextResponse> {
  try {
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    const zipData = new Uint8Array(buffer)

    // Use fflate to properly decompress (handles DEFLATE method 8)
    const unzipped = unzipSync(zipData)

    // Find the best subtitle file: .srt > .ass > .vtt
    const fileNames = Object.keys(unzipped)
    const srtFile = fileNames.find(f => f.toLowerCase().endsWith('.srt'))
    const assFile = fileNames.find(f => f.toLowerCase().endsWith('.ass'))
    const vttFile = fileNames.find(f => f.toLowerCase().endsWith('.vtt'))
    const target = srtFile || assFile || vttFile

    if (!target) {
      console.error('[SubDL Zip] No subtitle found in zip. Files:', fileNames)
      return NextResponse.json({ error: 'No subtitle in zip' }, { status: 400 })
    }

    const rawContent = unzipped[target]
    const content = decodeSubtitleBuffer(rawContent.buffer)

    // If .ass, convert to SRT-like first
    const vttContent = target.toLowerCase().endsWith('.vtt')
      ? content
      : srtToVtt(target.toLowerCase().endsWith('.ass') ? assToSrt(content) : content)

    return NextResponse.json({ vttContent })
  } catch (err) {
    console.error('[SubDL Zip]', err)
    return NextResponse.json({ error: 'Zip extraction failed' }, { status: 500 })
  }
}

// ─── Basic ASS to SRT converter ───
function assToSrt(ass: string): string {
  const lines = ass.split('\n')
  const dialogues: string[] = []
  let idx = 1

  for (const line of lines) {
    if (!line.startsWith('Dialogue:')) continue
    const parts = line.substring(9).split(',')
    if (parts.length < 10) continue

    const start = parts[1].trim()
    const end = parts[2].trim()
    const text = parts.slice(9).join(',')
      .replace(/\{[^}]*\}/g, '')  // Remove ASS tags
      .replace(/\\N/g, '\n')
      .replace(/\\n/g, '\n')
      .trim()

    if (!text) continue

    const formatTime = (t: string) => {
      const [h, m, rest] = t.split(':')
      const [s, cs] = rest.split('.')
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')},${(cs || '0').padEnd(3, '0')}`
    }

    dialogues.push(`${idx}\n${formatTime(start)} --> ${formatTime(end)}\n${text}\n`)
    idx++
  }

  return dialogues.join('\n')
}

// ─── Smart encoding detection ───
function decodeSubtitleBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)

  // Check BOM for UTF-8
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(buffer)
  }
  // UTF-16 LE BOM
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(buffer)
  }

  // Try UTF-8 first
  let content = new TextDecoder('utf-8').decode(buffer)
  const badChars = (content.match(/\uFFFD/g) || []).length

  // If many replacement chars, try Windows-1256 (Arabic)
  if (badChars > 5) {
    const cp1256 = new TextDecoder('windows-1256').decode(buffer)
    // Verify it looks like Arabic
    const arabicChars = (cp1256.match(/[\u0600-\u06FF]/g) || []).length
    if (arabicChars > 10) return cp1256

    // Try ISO-8859-1 as last resort
    return new TextDecoder('iso-8859-1').decode(buffer)
  }

  return content
}

// ─── SRT to VTT converter ───
function srtToVtt(srt: string): string {
  const cleaned = srt
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Convert SRT timestamp format to VTT
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    // Remove sequence numbers on their own lines
    .replace(/^\d+\s*$/gm, '')
    .trim()

  return `WEBVTT\n\nSTYLE\n::cue {\n  background: rgba(0,0,0,0.75);\n  color: white;\n  font-size: 1.3em;\n  line-height: 1.4;\n  padding: 4px 8px;\n  border-radius: 4px;\n}\n\n${cleaned}`
}
