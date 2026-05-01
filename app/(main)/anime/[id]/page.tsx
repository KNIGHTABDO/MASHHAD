import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getServerT } from '@/lib/i18n/server'
import { buildAnimeSeasonData } from '@/lib/anime/season'
import { getPreferredTitle, stripHtml, getAnimeYear } from '@/lib/anime/anilist'
import { findTmdbMovieId } from '@/lib/anime/tmdb-mapping'
import { AnimeSeasonList } from '@/components/anime/AnimeSeasonList'
import { WatchlistButton } from '@/components/content/WatchlistButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AnimeDetailPage({ params }: Props) {
  const { id } = await params
  const animeId = Number(id)
  if (!animeId || Number.isNaN(animeId)) notFound()

  const { t, lang } = await getServerT()

  let data
  try {
    data = await buildAnimeSeasonData(animeId)
  } catch {
    notFound()
  }

  const { anime, seasons } = data
  const title = getPreferredTitle(anime, lang)
  const year = getAnimeYear(anime)
  const overview = stripHtml(anime.description || '')
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '0.0'
  const bannerUrl = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || null
  const posterUrl = anime.coverImage?.extraLarge || anime.coverImage?.large || null
  const isMovie = anime.format === 'MOVIE'

  const movieTmdbId = isMovie ? await findTmdbMovieId(anime) : null

  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value

  let resumeUrl: string | null = null
  let hasHistory = false

  const tmdbIds = seasons
    .map(season => season.tmdbId)
    .filter((id): id is number => Boolean(id))
    .map(String)

  if (profileId && tmdbIds.length > 0) {
    try {
      const supabase = await createClient()
      const { data: history } = await supabase
        .from('watch_history')
        .select('content_id, season_number, episode_number')
        .eq('profile_id', profileId)
        .eq('content_type', 'episode')
        .in('content_id', tmdbIds)
        .order('watched_at', { ascending: false })
        .limit(1)

      if (history && history.length > 0) {
        const last = history[0]
        hasHistory = true
        resumeUrl = `/watch/${last.content_id}?type=tv&season=${last.season_number || 1}&episode=${last.episode_number || 1}`
      }
    } catch {
      // ignore resume failures
    }
  }

  const primarySeason = seasons.find(season => season.tmdbId && season.tmdbSeasonNumber)
  const defaultWatchUrl = !isMovie && primarySeason
    ? `/watch/${primarySeason.tmdbId}?type=tv&season=${primarySeason.tmdbSeasonNumber}&episode=1`
    : null

  const movieWatchUrl = movieTmdbId ? `/watch/${movieTmdbId}?type=movie` : null
  const watchUrl = resumeUrl || movieWatchUrl || defaultWatchUrl
  const watchlistId = isMovie
    ? (movieTmdbId ? String(movieTmdbId) : null)
    : (primarySeason?.tmdbId ? String(primarySeason.tmdbId) : null)
  const watchlistType = isMovie ? 'movie' : 'series'

  return (
    <div className="min-h-screen">
      <div className="relative h-[65vh] overflow-hidden">
        {bannerUrl && (
          <Image src={bannerUrl} alt={title} fill priority className="object-cover object-top" sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/60 to-transparent" />
      </div>

      <div className="relative -mt-64 z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 items-start">
            <div className="hidden md:block flex-shrink-0 w-52">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-[#141414]">
                {posterUrl && (
                  <Image src={posterUrl} alt={title} fill className="object-cover" sizes="208px" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-32">
              <h1 className="text-[clamp(1.75rem,4vw,3rem)] font-black leading-tight mb-2">{title}</h1>

              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-[#B3B3B3]">
                <span className="text-[#F5A623] font-medium">★ {rating}</span>
                <span className="text-[#444]">•</span>
                <span>{year || '-'}</span>
                {!isMovie && seasons.length > 0 && (
                  <>
                    <span className="text-[#444]">•</span>
                    <span>{seasons.length} {t.content.seasons}</span>
                  </>
                )}
              </div>

              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {anime.genres.map(g => (
                    <span key={g} className="text-xs bg-[#1F1F1F] border border-[var(--border-subtle)] px-3 py-1 rounded-full text-[#B3B3B3]">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {overview && (
                <div className="mb-8">
                  <p className="text-[#E0E0E0] leading-relaxed">{overview}</p>
                </div>
              )}

              <div className="flex items-center gap-4 mb-10">
                {watchUrl && (
                  <Link
                    href={watchUrl}
                    className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-all hover:scale-[1.02]"
                  >
                    ▶ {hasHistory ? t.content.resume : t.content.watchNow}
                  </Link>
                )}
                {watchlistId && (
                  <WatchlistButton contentId={watchlistId} contentType={watchlistType} />
                )}
              </div>
            </div>
          </div>

          {!isMovie && seasons.length > 0 && (
            <AnimeSeasonList seasons={seasons} />
          )}
        </div>
      </div>
    </div>
  )
}
