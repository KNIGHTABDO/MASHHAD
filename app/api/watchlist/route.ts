import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const contentId = searchParams.get('contentId')
  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value
  if (!profileId) return NextResponse.json({ inList: false, items: [] })

  const supabase = await createClient()

  // If contentId provided, check if it's in the list
  if (contentId) {
    const { data } = await supabase
      .from('watchlist')
      .select('id')
      .eq('profile_id', profileId)
      .eq('content_id', contentId)
      .maybeSingle()
    return NextResponse.json({ inList: !!data })
  }

  // Otherwise return full watchlist
  const { data } = await supabase
    .from('watchlist')
    .select('*')
    .eq('profile_id', profileId)
    .order('added_at', { ascending: false })

  return NextResponse.json({ items: data || [] })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value
  if (!profileId) return NextResponse.json({ error: 'No profile' }, { status: 401 })

  const { contentId, contentType } = await request.json()
  if (!contentId) return NextResponse.json({ error: 'Missing contentId' }, { status: 400 })

  const supabase = await createClient()

  // Check if already in list
  const { data: existing } = await supabase
    .from('watchlist')
    .select('id')
    .eq('profile_id', profileId)
    .eq('content_id', contentId)
    .maybeSingle()

  if (existing) {
    // Remove from list
    await supabase.from('watchlist').delete().eq('id', existing.id)
    return NextResponse.json({ action: 'removed' })
  } else {
    // Add to list
    await supabase.from('watchlist').insert({
      profile_id: profileId,
      content_id: contentId,
      content_type: contentType || 'movie',
    })
    return NextResponse.json({ action: 'added' })
  }
}
