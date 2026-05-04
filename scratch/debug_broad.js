const BASE_URL = 'https://tv8.egydead.live'
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': BASE_URL
}

async function debugSearch(q) {
  const url = `${BASE_URL}/?s=${encodeURIComponent(q)}`
  console.log(`Searching: ${url}`)
  const res = await fetch(url, { headers: BROWSER_HEADERS })
  const html = await res.text()

  const links = []
  const linkRegex = /<a\s+[^>]*href="([^"]+egydead[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1]
    const text = m[2].replace(/<[^>]*>/g, '').trim()
    if (text) links.push({ href, text })
  }

  const epLinks = links.filter(l => l.href.includes('/episode/'))
  console.log('Episode links found:', JSON.stringify(epLinks, null, 2))
}

debugSearch('Trying Here')
