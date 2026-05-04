import type { ServerAdapter, StreamResult } from '@/types/stream'

const BASE_URL = 'https://tv8.egydead.live'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
}

async function getTMDBInfo(tmdbId: string, type: 'movie' | 'episode'): Promise<{ title: string; year: number } | null> {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv'
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) return null
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${apiKey}&language=en-US`,
        { signal: controller.signal, next: { revalidate: 3600 } }
      )
      if (!res.ok) return null
      const data = await res.json()
      const title = data.name || data.title
      const date = data.release_date || data.first_air_date || '2000-01-01'
      return { title, year: new Date(date).getFullYear() }
    } finally {
      clearTimeout(tid)
    }
  } catch {
    return null
  }
}

async function extractStreamFromEmbed(embedUrl: string): Promise<{ url: string; type: 'hls' | 'mp4' } | null> {
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch(embedUrl, {
        headers: { ...BROWSER_HEADERS, 'Referer': BASE_URL + '/' },
        signal: controller.signal,
      })
      const html = await res.text()

      // Plain m3u8 link
      const m3u8Match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i)
      if (m3u8Match) return { url: m3u8Match[1], type: 'hls' }

      // JWPlayer / video.js file config
      const fileMatch = html.match(/"file"\s*:\s*"(https?:\/\/[^"]+)"/i)
      if (fileMatch) {
        const u = fileMatch[1]
        return { url: u, type: u.includes('.m3u8') ? 'hls' : 'mp4' }
      }

      // source src= attribute (html5 video)
      const srcMatch = html.match(/\bsrc\s*=\s*["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)["']/i)
      if (srcMatch) return { url: srcMatch[1], type: 'mp4' }

      // Dean Edwards packer — format: eval(function(p,a,c,k,e,d){...}('p',a,c,'k'.split
      const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split/)
      if (packedMatch) {
        try {
          let p = packedMatch[1]
          const a = parseInt(packedMatch[2])
          let c = parseInt(packedMatch[3])
          const k = packedMatch[4].split('|')
          while (c--) {
            if (k[c]) p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c])
          }
          const unpacked = p.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i)
          if (unpacked) return { url: unpacked[0], type: 'hls' }
          const mp4 = p.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/i)
          if (mp4) return { url: mp4[0], type: 'mp4' }
        } catch { /* continue */ }
      }

      return null
    } finally {
      clearTimeout(tid)
    }
  } catch {
    return null
  }
}




// Fetch the page with POST View=1 to reveal the serversList
async function fetchServerList(pageUrl: string): Promise<string> {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(pageUrl, {
      method: 'POST',
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': BASE_URL,
        'Referer': pageUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      body: 'View=1',
      signal: controller.signal,
    })
    return await res.text()
  } finally {
    clearTimeout(tid)
  }
}

// Parse the <ul class="serversList"> and return data-link values
function parseServerLinks(html: string): { name: string; url: string }[] {
  const ulMatch = html.match(/<ul class="serversList">([\s\S]*?)<\/ul>/i)
  if (!ulMatch) return []
  const ul = ulMatch[1]
  const results: { name: string; url: string }[] = []
  const liRegex = /<li[^>]+data-link="([^"]+)"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/gi
  let m
  while ((m = liRegex.exec(ul)) !== null) {
    results.push({ url: m[1], name: m[2].trim() })
  }
  return results
}

export const egydeadAdapter: ServerAdapter = {
  name: 'egydead',
  async resolve(tmdbId, type, season, episode) {
    try {
      const info = await getTMDBInfo(tmdbId, type === 'movie' ? 'movie' : 'episode')
      if (!info) return []

      const sNum = season ?? 1
      const eNum = episode ?? 1
      const searchQuery = type === 'movie'
        ? `${info.title} ${info.year}`
        : info.title

      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(searchQuery)}`
      console.log(`[EgyDead] Searching: ${searchUrl}`)

      const searchController = new AbortController()
      const searchTid = setTimeout(() => searchController.abort(), 8000)
      let searchHtml = ''
      try {
        const res = await fetch(searchUrl, { headers: BROWSER_HEADERS, signal: searchController.signal })
        searchHtml = await res.text()
      } finally {
        clearTimeout(searchTid)
      }

      // Extract all links from search results
      const links: { href: string; text: string }[] = []
      const linkRegex = /<a\s+[^>]*href="([^"]+egydead[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
      let m
      while ((m = linkRegex.exec(searchHtml)) !== null) {
        const text = m[2].replace(/<[^>]*>/g, '').trim()
        if (text) links.push({ href: m[1], text })
      }

      console.log(`[EgyDead] Found ${links.length} links in search results`)

      let targetUrl: string | null = null
      const titleLower = info.title.toLowerCase()

      if (type === 'movie') {
        const match = links.find(l => {
          const t = l.text.toLowerCase()
          return t.includes(titleLower) && t.includes(String(info.year))
        }) ?? links.find(l => l.text.toLowerCase().includes(titleLower))
        if (match) targetUrl = match.href
      } else {
        const eNumStr = String(eNum)
        const eNumPadded = eNumStr.padStart(2, '0')
        // Match episode number with optional leading zero, preceded by e, E, -, or /
        // examples: -4-, -04-, e4, e04, /4/, /04/
        const episodeHrefPattern = new RegExp(`[eE/-]0?${eNum}(?:-|/|$)`, 'i')
        
        const match = links.find(l => {
          const decodedHref = decodeURIComponent(l.href).toLowerCase()
          if (!decodedHref.includes('/episode/')) return false
          if (episodeHrefPattern.test(decodedHref) && decodedHref.includes(titleLower.replace(/\s+/g, '-'))) return true
          const t = l.text.toLowerCase()
          const hasTitle = t.includes(titleLower)
          const hasEpisode = t.includes(`الحلقة ${eNum}`) || t.includes(`الحلقة ${eNumPadded}`) || t.includes(`episode ${eNum}`) || t.includes(`e${eNum}`) || t.includes(`e${eNumPadded}`)
          return hasTitle && hasEpisode
        })
        if (match) {
          targetUrl = match.href
        } else {
          // 2. FALLBACK: If no direct episode link, check for season links to scan the season page
          console.log('[EgyDead] No direct episode link in search, checking for season page...')
          const seasonMatch = links.find(l => {
            const decoded = decodeURIComponent(l.href).toLowerCase()
            return decoded.includes('/season/') && (decoded.includes(titleLower.replace(/\s+/g, '-')) || l.text.toLowerCase().includes(titleLower))
          })

          if (seasonMatch) {
            console.log(`[EgyDead] Fetching season page to find episode: ${seasonMatch.href}`)
            const seasonHtml = await fetchServerList(seasonMatch.href)
            const seasonLinks: { href: string; text: string }[] = []
            const sLinkRegex = /<a\s+[^>]*href="([^"]+egydead[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
            let sm
            while ((sm = sLinkRegex.exec(seasonHtml)) !== null) {
              const text = sm[2].replace(/<[^>]*>/g, '').trim()
              if (text) seasonLinks.push({ href: sm[1], text })
            }
            
            const epMatch = seasonLinks.find(l => {
              const decoded = decodeURIComponent(l.href).toLowerCase()
              if (!decoded.includes('/episode/')) return false
              return episodeHrefPattern.test(decoded)
            })
            if (epMatch) targetUrl = epMatch.href
          }
        }
      }

      if (!targetUrl) {
        console.log('[EgyDead] No matching page found in search results')
        return []
      }

      console.log(`[EgyDead] Fetching detail page (POST View=1): ${targetUrl}`)

      // KEY FIX: POST with View=1 to unlock the server list
      const html = await fetchServerList(targetUrl)
      const servers = parseServerLinks(html)

      console.log(`[EgyDead] Found ${servers.length} servers: ${servers.map(s => s.name).join(', ')}`)

      if (servers.length === 0) return []

      // Prefer StreamRuby (direct HLS), then any embed that supports m3u8

      const PREFERRED = ['streamruby', 'streamhg', 'byse']
      const sorted = [...servers].sort((a, b) => {
        const ai = PREFERRED.findIndex(p => a.name.toLowerCase().includes(p))
        const bi = PREFERRED.findIndex(p => b.name.toLowerCase().includes(p))
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })

      // Try each embed until we get a playable stream (HLS preferred, MP4 fallback)
      const label = type === 'movie'
        ? `${info.title} (${info.year})`
        : `${info.title} S${String(sNum).padStart(2, '0')}E${String(eNum).padStart(2, '0')}`

      for (const server of sorted) {
        console.log(`[EgyDead] Trying server: ${server.name} (${server.url})`)
        const stream = await extractStreamFromEmbed(server.url)
        if (stream) {
          console.log(`[EgyDead] Got ${stream.type} from ${server.name}: ${stream.url.substring(0, 80)}...`)
          return [{
            url: stream.url,
            server: 'egydead',
            type: stream.type,
            isRealDebrid: false,
            quality: 'auto',
            label: `EgyDead (${server.name})`,
            fileName: label,
          } as StreamResult]
        }
        console.log(`[EgyDead] No stream from ${server.name}, trying next...`)
      }

      // Last resort: scan the raw detail page HTML for any direct mp4 links
      // strictly ensuring it ends with .mp4 (no .html)
      const rawMp4 = html.match(/https?:\/\/[^\s"']+(?:egydead|forafile|cdn)[^\s"']*\.mp4(?=["'\s?]|$)/i)
      if (rawMp4) {
        console.log(`[EgyDead] Found raw mp4 in page HTML: ${rawMp4[0].substring(0, 80)}`)
        return [{
          url: rawMp4[0],
          server: 'egydead',
          type: 'mp4',
          isRealDebrid: false,
          quality: 'auto',
          label: 'EgyDead (Direct)',
          fileName: label,
        } as StreamResult]
      }

      console.log('[EgyDead] All servers exhausted, no stream found')
      return []
    } catch (err) {
      console.error('[EgyDead]', err)
      return []
    }
  },
}
