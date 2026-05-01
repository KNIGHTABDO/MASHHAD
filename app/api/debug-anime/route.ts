import { NextResponse } from 'next/server'
import { buildAnimeSeasonData } from '@/lib/anime/season'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || '113415'
  
  try {
    const data = await buildAnimeSeasonData(Number(id))
    return NextResponse.json(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
