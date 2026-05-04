const BASE_URL = 'https://tv8.egydead.live'
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': BASE_URL
}

async function debugSeason(seasonUrl) {
  console.log(`Fetching season page: ${seasonUrl}`)
  const res = await fetch(seasonUrl, { headers: BROWSER_HEADERS })
  const html = await res.text()

  const links = []
  const linkRegex = /<a\s+[^>]*href="([^"]+egydead[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1]
    const text = m[2].replace(/<[^>]*>/g, '').trim()
    if (text) links.push({ href, text })
  }

  const episodeLinks = links.filter(l => l.href.includes('/episode/'))
  console.log('All episode links on season page:', JSON.stringify(episodeLinks, null, 2))
}

debugSeason('https://tv8.egydead.live/season/we-are-all-trying-here-2026/')
