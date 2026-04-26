import { tmdb } from '@/lib/tmdb/client'
import { HeroSection } from '@/components/content/HeroSection'
import { ContentRow } from '@/components/content/ContentRow'
import { getServerT } from '@/lib/i18n/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'مشهد | أنمي - Mashhad | Anime',
  description: 'أفضل الأنميات - Top Anime',
}

export default async function AnimePage() {
  const { t } = await getServerT()

  const [trending, movies, topRated] = await Promise.all([
    tmdb.discover('tv', { with_original_language: 'ja', with_genres: '16', sort_by: 'popularity.desc' })
      .then((d: { results: unknown[] }) => d.results?.slice(0, 20) || [])
      .catch(() => []),
    tmdb.discover('movie', { with_original_language: 'ja', with_genres: '16', sort_by: 'popularity.desc' })
      .then((d: { results: unknown[] }) => d.results?.slice(0, 20) || [])
      .catch(() => []),
    tmdb.discover('tv', { with_original_language: 'ja', with_genres: '16', sort_by: 'vote_average.desc', 'vote_count.gte': '1000' })
      .then((d: { results: unknown[] }) => d.results?.slice(0, 20) || [])
      .catch(() => []),
  ])

  return (
    <main className="min-h-screen pb-20">
      <HeroSection items={trending.slice(0, 5) as never[]} mediaType="tv" />
      
      <div className="relative z-10 -mt-20 sm:-mt-32 space-y-10">
        <ContentRow title={t.content.trendingAnime} items={trending.slice(5) as never[]} variant="large" mediaType="tv" />
        <ContentRow title={t.content.topAnimeMovies} items={movies as never[]} variant="standard" mediaType="movie" />
        <ContentRow title={t.content.highestRatedAnime} items={topRated as never[]} variant="numbered" mediaType="tv" />
      </div>
    </main>
  )
}
