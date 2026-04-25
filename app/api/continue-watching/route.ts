import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
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
