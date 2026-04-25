import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { tmdb } from '@/lib/tmdb/client'
import { getTMDBImageUrl, formatYear, formatRuntime, formatRating } from '@/lib/utils/format'
import { getServerT } from '@/lib/i18n/server'
import { WatchlistButton } from '@/components/content/WatchlistButton'
import type { Movie } from '@/types/content'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MovieDetailPage({ params }: Props) {
  const { id } = await params
  const { t, lang } = await getServerT()
  let movie: Movie

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    movie = await (tmdb.movie(id) as any)
  } catch {
    notFound()
  }

  // Fetch watch history
  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value
  let progress = 0
  if (profileId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('watch_history')
      .select('progress_seconds, completed')
      .eq('profile_id', profileId)
      .eq('content_id', id)
      .eq('content_type', 'movie')
      .order('watched_at', { ascending: false })
      .limit(1)
    
    if (data && data.length > 0 && !data[0].completed) {
      progress = data[0].progress_seconds || 0
    }
  }

  const title = movie.title || ''
  const year = formatYear(movie.release_date || '')
  const backdropUrl = getTMDBImageUrl(movie.backdrop_path, 'w1280')
  const posterUrl = getTMDBImageUrl(movie.poster_path, 'w500')
  const directors = movie.credits?.crew.filter(c => c.job === 'Director') || []
  const cast = movie.credits?.cast.slice(0, 8) || []

  return (
    <div className="min-h-screen">
      {/* Hero Backdrop */}
      <div className="relative h-[65vh] overflow-hidden">
        {movie.backdrop_path && (
          <Image src={backdropUrl} alt={title} fill priority className="object-cover object-top" sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/60 to-transparent" />
      </div>

      {/* Content */}
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

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-[#B3B3B3]">
                <span className="text-[#F5A623] font-medium">★ {formatRating(movie.vote_average)}</span>
                <span className="text-[#444]">•</span>
                <span>{year}</span>
                {movie.runtime && (
                  <>
                    <span className="text-[#444]">•</span>
                    <span>{formatRuntime(movie.runtime, lang)}</span>
                  </>
                )}
                {movie.status && (
                  <span className="bg-[#1F1F1F] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md text-xs">
                    {movie.status === 'Released' ? (lang === 'ar' ? 'صدر' : 'Released') : movie.status}
                  </span>
                )}
              </div>

              {/* Genre badges */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {movie.genres.map(g => (
                    <Link
                      key={g.id}
                      href={`/browse/${g.id}`}
                      className="text-xs bg-[#1F1F1F] border border-[var(--border-subtle)] px-3 py-1 rounded-full text-[#B3B3B3] hover:border-[var(--border-visible)] hover:text-white transition-colors"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Overview */}
              {movie.overview && (
                <div className="mb-8">
                  <h2 className="text-sm font-semibold text-[#B3B3B3] mb-2">{t.content.synopsis}</h2>
                  <p className="text-[#E0E0E0] leading-relaxed">{movie.overview}</p>
                </div>
              )}

              {/* Directors */}
              {directors.length > 0 && (
                <p className="text-sm text-[#B3B3B3] mb-6">
                  <span className="text-white font-medium">{lang === 'ar' ? 'الإخراج: ' : 'Director: '}</span>
                  {directors.map(d => d.name).join('، ')}
                </p>
              )}

              {/* CTAs */}
              <div className="flex items-center gap-4 mb-10">
                <Link
                  href={`/watch/${movie.id}?type=movie`}
                  className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-all hover:scale-[1.02]"
                >
                  ▶ {progress > 30 ? (lang === 'ar' ? 'استئناف' : 'Resume') : t.content.watchNow}
                </Link>
                <WatchlistButton contentId={String(movie.id)} contentType="movie" />
              </div>
            </div>
          </div>

          {/* Cast */}
          {cast.length > 0 && (
            <section className="mt-8 pb-16">
              <h2 className="text-xl font-bold mb-6">{lang === 'ar' ? 'الممثلون' : 'Cast'}</h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                {cast.map(member => (
                  <div key={member.id} className="text-center">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-[#141414] mb-2">
                      {member.profile_path ? (
                        <Image
                          src={getTMDBImageUrl(member.profile_path, 'w300')}
                          alt={member.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-[#444]">👤</div>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate">{member.name}</p>
                    <p className="text-xs text-[#666] truncate">{member.character}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {movie.recommendations?.results && movie.recommendations.results.length > 0 && (
            <section className="pb-16">
              <h2 className="text-xl font-bold mb-6">{t.content.recommended}</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {movie.recommendations.results.slice(0, 8).map(rec => (
                  <Link key={rec.id} href={`/movie/${rec.id}`} className="group">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#141414]">
                      <Image
                        src={getTMDBImageUrl(rec.poster_path, 'w300')}
                        alt={rec.title || ''}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="150px"
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#B3B3B3] truncate">{rec.title}</p>
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
