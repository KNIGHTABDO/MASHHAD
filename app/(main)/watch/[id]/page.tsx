import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { WatchClient } from '@/components/player/WatchClient'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string; season?: string; episode?: string }>
}

export default async function WatchPage({ params, searchParams }: Props) {
  const { id } = await params
  const { type = 'movie', season, episode } = await searchParams

  // Get profile ID from cookie
  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value || null

  // Fetch existing watch progress if profile exists
  let initialProgress = 0
  if (profileId) {
    try {
      const supabase = await createClient()
      const query = supabase
        .from('watch_history')
        .select('progress_seconds, duration_seconds, completed')
        .eq('profile_id', profileId)
        .eq('content_id', id)
        .eq('content_type', type === 'tv' ? 'episode' : 'movie')

      if (type === 'tv' && season && episode) {
        query.eq('season_number', parseInt(season)).eq('episode_number', parseInt(episode))
      }

      const { data } = await query.order('watched_at', { ascending: false }).limit(1)

      if (data && data.length > 0 && !data[0].completed) {
        initialProgress = data[0].progress_seconds || 0
      }
    } catch {
      // No existing watch history, start from 0
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#B3B3B3]">جاري تحميل المشغّل...</p>
          </div>
        </div>
      }>
        <WatchClient
          contentId={id}
          type={type as 'movie' | 'tv'}
          season={season ? parseInt(season) : undefined}
          episode={episode ? parseInt(episode) : undefined}
          profileId={profileId}
          initialProgress={initialProgress}
        />
      </Suspense>
    </div>
  )
}
