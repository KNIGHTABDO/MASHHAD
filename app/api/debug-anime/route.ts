import { NextResponse } from 'next/server'
import { buildAnimeSeasonData } from '@/lib/anime/season'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || '113415'
  
  try {
    const data = await buildAnimeSeasonData(Number(id))
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
