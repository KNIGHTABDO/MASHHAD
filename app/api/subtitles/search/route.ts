import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type') || 'movie'
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')
  const language = searchParams.get('language') || 'ar'

  if (!tmdbId) return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 })

  const TMDB_KEY = process.env.TMDB_API_KEY
  const API_KEY = process.env.OPENSUBTITLES_API_KEY
  if (!API_KEY || !TMDB_KEY) return NextResponse.json({ subtitles: [] })

  try {
    // 1. Get IMDB ID for Stremio addon
    const extRes = await fetch(`https://api.themoviedb.org/3/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}/external_ids?api_key=${TMDB_KEY}`)
    const extData = await extRes.json()
    const imdbId = extData.imdb_id

    // 2. Fetch from Stremio OpenSubtitles v3 Addon (Legacy Database - often has subs the new API misses)
    let stremioSubs: any[] = []
    if (imdbId) {
      const stremioType = type === 'movie' ? 'movie' : 'series'
      const stremioId = type === 'movie' ? imdbId : `${imdbId}:${season}:${episode}`
      const langCode = language === 'ar' ? 'ara' : 'eng'
      try {
        const stremioRes = await fetch(`https://opensubtitles-v3.strem.io/subtitles/${stremioType}/${stremioId}/${langCode}.json`, { next: { revalidate: 3600 } })
        if (stremioRes.ok) {
          const stremioData = await stremioRes.json()
          if (stremioData.subtitles) {
            stremioSubs = stremioData.subtitles
              .filter((s: any) => s.lang === langCode)
              .map((s: any) => ({
                id: s.id,
                fileId: s.url, // Store the direct download URL in fileId
                fileName: s.id + '.srt',
                language: language,
                downloadCount: 9999, // High priority
                rating: 5,
                uploaderName: 'Stremio (Legacy Database)'
              }))
          }
        }
      } catch (err) {
        console.error('[Stremio Subs]', err)
      }
    }

    // 3. Fetch from OpenSubtitles REST API v1
    let restSubs: any[] = []
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
          'Api-Key': API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'Mashhad v1.0',
        },
        next: { revalidate: 3600 },
      })

      if (res.ok) {
        const data = await res.json()
        restSubs = (data.data || []).slice(0, 10).map((item: any) => ({
          id: item.id,
          fileId: item.attributes.files[0]?.file_id?.toString() || item.id,
          fileName: item.attributes.files[0]?.file_name || '',
          language: item.attributes.language,
          downloadCount: item.attributes.download_count,
          rating: item.attributes.ratings,
          uploaderName: item.attributes.uploader?.name || 'مجهول',
        }))
      }
    } catch (err) {
      console.error('[REST Subs]', err)
    }

    // Combine results
    const subtitles = [...stremioSubs, ...restSubs]

    return NextResponse.json({ subtitles }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800' },
    })
  } catch (error) {
    console.error('[Subtitles]', error)
    return NextResponse.json({ subtitles: [] })
  }
}

export async function POST(request: Request) {
  // Download subtitle by fileId and return the URL / VTT content
  const API_KEY = process.env.OPENSUBTITLES_API_KEY
  if (!API_KEY) return NextResponse.json({ error: 'No API key' }, { status: 500 })

  const { fileId } = await request.json()
  if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 })

  try {
    let downloadLink = ''

    if (fileId.toString().startsWith('http')) {
      downloadLink = fileId
    } else {
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

    // Fetch the actual SRT content
    const srtRes = await fetch(downloadLink)
    const buffer = await srtRes.arrayBuffer()
    
    // Decode as UTF-8 first
    let srtContent = new TextDecoder('utf-8').decode(buffer)
    
    // Only fallback to Windows-1256 if there is massive UTF-8 corruption
    // and we aren't explicitly downloading a UTF-8 converted file from Stremio.
    const badCharsCount = (srtContent.match(/\uFFFD/g) || []).length
    if (badCharsCount > 20 && !downloadLink.includes('utf8')) {
      srtContent = new TextDecoder('windows-1256').decode(buffer)
    }
    
    const vttContent = srtToVtt(srtContent)

    return NextResponse.json({ vttContent, downloadUrl: downloadLink })
  } catch {
    return NextResponse.json({ error: 'Failed to download subtitle' }, { status: 500 })
  }
}

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

