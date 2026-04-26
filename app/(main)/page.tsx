import { tmdb } from '@/lib/tmdb/client'
import { HeroSection } from '@/components/content/HeroSection'
import { ContentRow } from '@/components/content/ContentRow'
import { ContinueWatchingRow, MyListRow, RecommendedRow } from '@/components/content/PersonalRows'
import { getServerT } from '@/lib/i18n/server'
import { Suspense } from 'react'
import { RowSkeleton } from '@/components/ui/RowSkeleton'

async function getTrendingMovies() {
  try {
    const data = await tmdb.trending('movie', 'week')
    return data.results?.slice(0, 20) || []
  } catch { return [] }
}

async function getTrendingTV() {
  try {
    const data = await tmdb.trending('tv', 'week')
    return data.results?.slice(0, 20) || []
  } catch { return [] }
}

async function getPopularMovies() {
  try {
    const data = await tmdb.popular('movie')
    return data.results?.slice(0, 20) || []
  } catch { return [] }
}

async function getPopularTV() {
  try {
    const data = await tmdb.popular('tv')
    return data.results?.slice(0, 20) || []
  } catch { return [] }
}

async function getTopRatedMovies() {
  try {
    const data = await tmdb.topRated('movie')
    return data.results?.slice(0, 20) || []
  } catch { return [] }
}

async function getArabicContent() {
  try {
    const data = await tmdb.discover('movie', { with_original_language: 'ar', sort_by: 'popularity.desc' })
    return data.results?.slice(0, 20) || []
  } catch { return [] }
}

export default async function HomePage() {
  const { t } = await getServerT()
  const [trending, trendingTV, popularMovies, popularTV, topRated, arabic] = await Promise.all([
    getTrendingMovies(),
    getTrendingTV(),
    getPopularMovies(),
    getPopularTV(),
    getTopRatedMovies(),
    getArabicContent(),
  ])

  const heroItems = [...trending.slice(0, 3), ...trendingTV.slice(0, 3)]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <Suspense fallback={<div className="h-[85vh] skeleton" />}>
        <HeroSection items={heroItems} />
      </Suspense>

      {/* Content Rows */}
      <div className="relative z-10 -mt-32 pb-16 space-y-10">
        {/* Personal rows (client-side, profile-aware) */}
        <ContinueWatchingRow />
        <MyListRow />
        <RecommendedRow />

        <Suspense fallback={<RowSkeleton />}>
          <ContentRow title={t.content.topTen} items={trending} variant="numbered" mediaType="movie" />
        </Suspense>
        <Suspense fallback={<RowSkeleton />}>
          <ContentRow title={t.content.newAdditions} items={trendingTV} variant="standard" mediaType="tv" />
        </Suspense>
        <Suspense fallback={<RowSkeleton />}>
          <ContentRow title={t.content.arabicMovies} items={arabic} variant="standard" mediaType="movie" />
        </Suspense>
        <Suspense fallback={<RowSkeleton />}>
          <ContentRow title={t.content.highestRated} items={topRated} variant="standard" mediaType="movie" />
        </Suspense>
        <Suspense fallback={<RowSkeleton />}>
          <ContentRow title={t.content.actionMovies} items={popularMovies} variant="large" mediaType="movie" />
        </Suspense>
        <Suspense fallback={<RowSkeleton />}>
          <ContentRow title={t.content.comedySeries} items={popularTV} variant="standard" mediaType="tv" />
        </Suspense>
      </div>
    </div>
  )
}
