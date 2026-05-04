const BASE_URL = 'https://tv8.egydead.live'
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': BASE_URL
}

async function debugSearch(searchQuery, eNum) {
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(searchQuery)}`
  console.log(`Searching: ${searchUrl}`)

  const res = await fetch(searchUrl, { headers: BROWSER_HEADERS })
  const searchHtml = await res.text()

  const links = []
  const linkRegex = /<a\s+[^>]*href="([^"]+egydead[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = linkRegex.exec(searchHtml)) !== null) {
    const href = m[1]
    const text = m[2].replace(/<[^>]*>/g, '').trim()
    if (text) links.push({ href, text })
  }

  console.log(`Found ${links.length} links`)
  
  const eNumStr = String(eNum)
  const eNumPadded = eNumStr.padStart(2, '0')
  const episodeHrefPattern = new RegExp(`[eE/-]0?${eNum}(?:-|/|$)`, 'i')

  const results = links.map(l => {
    const decodedHref = decodeURIComponent(l.href).toLowerCase()
    const isEpisode = decodedHref.includes('/episode/')
    const hrefMatches = episodeHrefPattern.test(decodedHref)
    const titleLower = searchQuery.toLowerCase()
    const t = l.text.toLowerCase()
    const hasTitle = t.includes(titleLower)
    const hasEpisode = t.includes(`الحلقة ${eNum}`) || t.includes(`الحلقة ${eNumPadded}`) || t.includes(`episode ${eNum}`) || t.includes(`e${eNum}`) || t.includes(`e${eNumPadded}`)
    
    return {
        text: l.text,
        href: l.href,
        isEpisode,
        hrefMatches,
        hasTitle,
        hasEpisode,
        score: (isEpisode ? 1 : 0) + (hrefMatches ? 2 : 0) + (hasTitle && hasEpisode ? 5 : 0)
    }
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score)

  console.log('Top matching results:', JSON.stringify(results.slice(0, 5), null, 2))
}

debugSearch('We Are All Trying Here', 6)
