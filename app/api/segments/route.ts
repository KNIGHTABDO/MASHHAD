import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tmdb_id = searchParams.get('tmdb_id')
  const type = searchParams.get('type')
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')

  if (!tmdb_id || type !== 'tv' || !season || !episode) {
    return NextResponse.json({ intro: null, outro: null })
  }

  try {
    // 1. Get IMDB ID from TMDB
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdb_id}/external_ids?api_key=${process.env.TMDB_API_KEY}`
    )
    if (!tmdbRes.ok) throw new Error('Failed to fetch from TMDB')
    
    const tmdbData = await tmdbRes.json()
    const imdb_id = tmdbData.imdb_id

    if (!imdb_id) {
      return NextResponse.json({ intro: null, outro: null })
    }

    // 2. Fetch segments from IntroDB
    const introRes = await fetch(
      `https://api.introdb.app/segments?imdb_id=${imdb_id}&season=${season}&episode=${episode}`,
      { headers: { 'User-Agent': 'Mashhad-App/1.0' } }
    )
    
    if (!introRes.ok) {
      return NextResponse.json({ intro: null, outro: null })
    }

    const introData = await introRes.json()
    return NextResponse.json(introData)
  } catch (error) {
    console.error('IntroDB Error:', error)
    return NextResponse.json({ intro: null, outro: null })
  }
}
