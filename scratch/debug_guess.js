const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

async function checkUrl(url) {
  console.log(`Checking: ${url}`)
  try {
    const res = await fetch(url, { method: 'HEAD', headers: BROWSER_HEADERS })
    console.log(`Status: ${res.status}`)
    return res.status === 200
  } catch (err) {
    console.log(`Error: ${err.message}`)
    return false
  }
}

async function start() {
    await checkUrl('https://tv8.egydead.live/episode/we-are-all-trying-here-s01e06/')
    await checkUrl('https://tv8.egydead.live/episode/we-are-all-trying-here-e06/')
    await checkUrl('https://tv8.egydead.live/episode/we-are-all-trying-here-6/')
}

start()
