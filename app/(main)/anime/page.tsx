import { HeroSection } from '@/components/content/HeroSection'
import { ContentRow } from '@/components/content/ContentRow'
import { getServerT } from '@/lib/i18n/server'
import { getTrendingAnime, getTopAnimeMovies, getTopRatedAnime, stripHtml, getPreferredTitle, getAnimeYear } from '@/lib/anime/anilist'
import type { Metadata } from 'next'
import type { AniListMedia } from '@/lib/anime/anilist'

export const metadata: Metadata = {
  title: 'مشهد | أنمي - Mashhad | Anime',
  description: 'أفضل الأنميات - Top Anime',
}

function toContentItem(item: AniListMedia, lang: 'ar' | 'en') {
  const year = getAnimeYear(item)
  return {
    id: item.id,
    title: getPreferredTitle(item, lang),
    poster_path: item.coverImage?.extraLarge || item.coverImage?.large || null,
    backdrop_path: item.bannerImage || item.coverImage?.extraLarge || item.coverImage?.large || null,
    first_air_date: year ? `${year}-01-01` : '',
    vote_average: item.averageScore ? item.averageScore / 10 : 0,
    overview: stripHtml(item.description || ''),
    detailUrl: `/anime/${item.id}`,
    watchUrl: `/anime/${item.id}`,
  }
}

export default async function AnimePage() {
  const { t, lang } = await getServerT()

  const [trending, movies, topRated] = await Promise.all([
    getTrendingAnime(20).catch(() => []),
    getTopAnimeMovies(20).catch(() => []),
    getTopRatedAnime(20).catch(() => []),
  ])

  const trendingItems = trending.map(item => toContentItem(item, lang))
  const movieItems = movies.map(item => toContentItem(item, lang))
  const topRatedItems = topRated.map(item => toContentItem(item, lang))

  return (
    <main className="min-h-screen pb-20">
      <HeroSection items={trendingItems.slice(0, 5) as never[]} mediaType="tv" />
      
      <div className="relative z-10 -mt-20 sm:-mt-32 space-y-10">
        <ContentRow title={t.content.trendingAnime} items={trendingItems.slice(5) as never[]} variant="large" mediaType="tv" />
        <ContentRow title={t.content.topAnimeMovies} items={movieItems as never[]} variant="standard" mediaType="movie" />
        <ContentRow title={t.content.highestRatedAnime} items={topRatedItems as never[]} variant="numbered" mediaType="tv" />
      </div>
    </main>
  )
}
