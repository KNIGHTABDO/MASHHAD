import type { ServerAdapter, StreamResult } from '@/types/stream'
import { headers } from 'next/headers'

const BASE_URL = 'https://tv8.egydead.live'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
}

// Proxies fetch through OCI Proxy with IP spoofing
async function proxiedFetch(url: string, options: RequestInit = {}) {
  const ociUrl = process.env.OCI_PROXY_URL
  const ociToken = process.env.OCI_PROXY_TOKEN
  
  if (ociUrl && ociToken) {
    const targetUrl = new URL(ociUrl)
    targetUrl.searchParams.append('url', url)
    
    // Capture user IP to spoof it on OCI
    const headersList = await headers()
    const userIp = headersList.get('x-forwarded-for')?.split(',')[0] || '';

    const customHeaders: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      'X-Proxy-Token': ociToken
    }

    if (userIp) {
      customHeaders['X-Forwarded-For'] = userIp
      customHeaders['X-Real-IP'] = userIp
    }

    return fetch(targetUrl.toString(), {
      ...options,
      headers: customHeaders
    })
  }

  const scraperKey = process.env.SCRAPERAPI_KEY
  if (!scraperKey) {
    return fetch(url, options)
  }

  const targetUrl = new URL('http://api.scraperapi.com/')
  targetUrl.searchParams.append('api_key', scraperKey)
  targetUrl.searchParams.append('url', url)
  
  if (options.headers) {
    targetUrl.searchParams.append('keep_headers', 'true')
  }

  return fetch(targetUrl.toString(), options)
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
    const tid = setTimeout(() => controller.abort(), 20000)
    try {
      // Use proxiedFetch with userIp to ensure the token binds to the user's home IP
      const res = await proxiedFetch(embedUrl, {
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

      // Dean Edwards packer
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
          const unpacked = p.match(/https?:\/\/[^\s"']+\.m3u8[^"'\s]*/i)
          if (unpacked) return { url: unpacked[0], type: 'hls' }
          const mp4 = p.match(/https?:\/\/[^\s"']+\.mp4[^"'\s]*/i)
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

async function fetchServerList(pageUrl: string): Promise<string> {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await proxiedFetch(pageUrl, {
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

      const searchHtml = await (await proxiedFetch(searchUrl, { headers: BROWSER_HEADERS })).text()

      const links: { href: string; text: string }[] = []
      const linkRegex = /<a\s+[^>]*href="([^"]+egydead[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
      let m
      while ((m = linkRegex.exec(searchHtml)) !== null) {
        const text = m[2].replace(/<[^>]*>/g, '').trim()
        if (text) links.push({ href: m[1], text })
      }

      let targetUrl: string | null = null
      const titleLower = info.title.toLowerCase()

      if (type === 'movie') {
        const match = links.find(l => {
          const t = l.text.toLowerCase()
          return t.includes(titleLower) && t.includes(String(info.year))
        }) ?? links.find(l => l.text.toLowerCase().includes(titleLower))
        if (match) targetUrl = match.href
      } else {
        const episodeHrefPattern = new RegExp(`[eE/-]0?${eNum}(?:-|/|$)`, 'i')
        const match = links.find(l => {
          const decodedHref = decodeURIComponent(l.href).toLowerCase()
          if (!decodedHref.includes('/episode/')) return false
          if (episodeHrefPattern.test(decodedHref) && decodedHref.includes(titleLower.replace(/\s+/g, '-'))) return true
          const t = l.text.toLowerCase()
          return t.includes(titleLower) && (t.includes(`الحلقة ${eNum}`) || t.includes(`episode ${eNum}`))
        })
        if (match) targetUrl = match.href
      }

      if (!targetUrl) return []

      const html = await fetchServerList(targetUrl)
      const servers = parseServerLinks(html)
      if (servers.length === 0) return []

      const PREFERRED = ['streamruby', 'streamhg', 'byse']
      const sorted = [...servers].sort((a, b) => {
        const ai = PREFERRED.findIndex(p => a.name.toLowerCase().includes(p))
        const bi = PREFERRED.findIndex(p => b.name.toLowerCase().includes(p))
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })

      const label = type === 'movie'
        ? `${info.title} (${info.year})`
        : `${info.title} S${String(sNum).padStart(2, '0')}E${String(eNum).padStart(2, '0')}`

      // We don't need to pass userIp explicitly because proxiedFetch now gets it from headers()
      for (const server of sorted) {
        console.log(`[EgyDead] Trying server: ${server.name}`)
        const stream = await extractStreamFromEmbed(server.url)
        if (stream) {
          const finalUrl = (process.env.OCI_PROXY_URL && process.env.OCI_PROXY_TOKEN)
            ? `/api/proxy?url=${encodeURIComponent(stream.url)}`
            : stream.url;

          return [{
            url: finalUrl,
            server: 'egydead',
            type: stream.type,
            isRealDebrid: false,
            quality: 'auto',
            label: `EgyDead (${server.name})`,
            fileName: label,
          } as StreamResult]
        }
      }

      return []
    } catch (err) {
      console.error('[EgyDead]', err)
      return []
    }
  },
}
