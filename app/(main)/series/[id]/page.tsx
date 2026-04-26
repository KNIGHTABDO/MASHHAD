import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { tmdb } from '@/lib/tmdb/client'
import { getTMDBImageUrl, formatYear, formatRating } from '@/lib/utils/format'
import { getServerT } from '@/lib/i18n/server'
import { EpisodeList } from '@/components/content/EpisodeList'
import { WatchlistButton } from '@/components/content/WatchlistButton'
import type { TVShow } from '@/types/content'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SeriesDetailPage({ params }: Props) {
  const { id } = await params
  const { t, lang } = await getServerT()
  let series: TVShow

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    series = await (tmdb.series(id) as any)
  } catch {
    notFound()
  }

  // Fetch watch history for series
  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value
  let resumeSeason = 1
  let resumeEpisode = 1
  let hasHistory = false

  if (profileId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('watch_history')
      .select('season_number, episode_number')
      .eq('profile_id', profileId)
      .eq('content_id', id)
      .eq('content_type', 'episode')
      .order('watched_at', { ascending: false })
      .limit(1)
    
    if (data && data.length > 0) {
      hasHistory = true
      resumeSeason = data[0].season_number || 1
      resumeEpisode = data[0].episode_number || 1
    }
  }

  const title = series.name || ''
  const year = formatYear(series.first_air_date || '')
  const backdropUrl = getTMDBImageUrl(series.backdrop_path, 'w1280')
  const posterUrl = getTMDBImageUrl(series.poster_path, 'w500')
  const cast = series.credits?.cast.slice(0, 8) || []

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-[65vh] overflow-hidden">
        {series.backdrop_path && (
          <Image src={backdropUrl} alt={title} fill priority className="object-cover object-top" sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/60 to-transparent" />
      </div>

      <div className="relative -mt-64 z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 items-start">
            {/* Poster */}
            <div className="hidden md:block flex-shrink-0 w-52">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl">
                <Image src={posterUrl} alt={title} fill className="object-cover" sizes="208px" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-32">
              <h1 className="text-[clamp(1.75rem,4vw,3rem)] font-black leading-tight mb-2">{title}</h1>

              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-[#B3B3B3]">
                <span className="text-[#F5A623] font-medium">★ {formatRating(series.vote_average)}</span>
                <span className="text-[#444]">•</span>
                <span>{year}</span>
                {series.number_of_seasons && (
                  <>
                    <span className="text-[#444]">•</span>
                    <span>{series.number_of_seasons} {t.content.seasons}</span>
                  </>
                )}
              </div>

              {series.genres && series.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {series.genres.map(g => (
                    <span key={g.id} className="text-xs bg-[#1F1F1F] border border-[var(--border-subtle)] px-3 py-1 rounded-full text-[#B3B3B3]">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {series.overview && (
                <div className="mb-8">
                  <p className="text-[#E0E0E0] leading-relaxed">{series.overview}</p>
                </div>
              )}

              <div className="flex items-center gap-4 mb-10">
                <Link
                  href={`/watch/${series.id}?type=tv&season=${resumeSeason}&episode=${resumeEpisode}`}
                  className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-all hover:scale-[1.02]"
                >
                  ▶ {hasHistory ? (lang === 'ar' ? `استئناف م${resumeSeason} ح${resumeEpisode}` : `Resume S${resumeSeason} E${resumeEpisode}`) : t.content.watchNow}
                </Link>
                <WatchlistButton contentId={String(series.id)} contentType="series" />
              </div>
            </div>
          </div>

          {/* Episodes */}
          {series.seasons && series.seasons.length > 0 && (
            <EpisodeList seriesId={id} seasons={series.seasons.filter(s => s.season_number > 0)} />
          )}

          {/* Cast */}
          {cast.length > 0 && (
            <section className="mt-12 pb-16">
              <h2 className="text-xl font-bold mb-6">{t.content.cast}</h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                {cast.map(member => (
                  <Link href={`/person/${member.id}`} key={member.id} className="text-center group block">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-[#141414] mb-2 group-hover:ring-2 ring-[#E50914] transition-all">
                      {member.profile_path ? (
                        <Image src={getTMDBImageUrl(member.profile_path, 'w300')} alt={member.name} fill className="object-cover group-hover:scale-105 transition-transform" sizes="80px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-[#444]">👤</div>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate group-hover:text-white transition-colors">{member.name}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
