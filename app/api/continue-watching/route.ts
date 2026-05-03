import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ items: [] }, { status: 401 })

  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value
  if (!profileId) return NextResponse.json({ items: [] })

  const supabase = await createClient()

  const { data } = await supabase
    .from('watch_history')
    .select('*')
    .eq('profile_id', profileId)
    .eq('completed', false)
    .gt('progress_seconds', 30)
    .order('watched_at', { ascending: false })
    .limit(20)

  // Deduplicate by content_id (only keep the most recent entry for each series/movie)
  const uniqueItems = new Map()
  if (data) {
    for (const item of data) {
      if (!uniqueItems.has(item.content_id)) {
        uniqueItems.set(item.content_id, item)
      }
    }
  }

  return NextResponse.json({ items: Array.from(uniqueItems.values()) })
}

export async function DELETE(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const contentId = searchParams.get('contentId')
  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value
  if (!profileId) return NextResponse.json({ error: 'No profile' }, { status: 401 })

  const supabase = await createClient()

  if (contentId) {
    // Delete specific item
    await supabase.from('watch_history').delete().eq('profile_id', profileId).eq('content_id', contentId)
  } else {
    // Clear all history
    await supabase.from('watch_history').delete().eq('profile_id', profileId)
  }

  return NextResponse.json({ success: true })
}
