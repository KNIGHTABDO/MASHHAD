import { tmdb } from '@/lib/tmdb/client'
import { ContentRow } from '@/components/content/ContentRow'
import { getServerT } from '@/lib/i18n/server'

export default async function MoviesPage() {
  const { t, lang } = await getServerT()
  const [popular, topRated, action, arabic] = await Promise.all([
    tmdb.popular('movie').then((d: { results: unknown[] }) => d.results?.slice(0, 20) || []).catch(() => []),
    tmdb.topRated('movie').then((d: { results: unknown[] }) => d.results?.slice(0, 20) || []).catch(() => []),
    tmdb.discover('movie', { with_genres: '28', sort_by: 'popularity.desc' }).then((d: { results: unknown[] }) => d.results?.slice(0, 20) || []).catch(() => []),
    tmdb.discover('movie', { with_original_language: 'ar', sort_by: 'popularity.desc' }).then((d: { results: unknown[] }) => d.results?.slice(0, 20) || []).catch(() => []),
  ])

  return (
    <div className="min-h-screen pt-8 pb-20 space-y-10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <h1 className="text-3xl font-black mb-2">{t.nav.movies}</h1>
        <div className="w-12 h-1 bg-[#E50914] rounded-full" />
      </div>
      <ContentRow title={lang === 'ar' ? 'الأكثر شعبية' : 'Most Popular'} items={popular as never[]} variant="large" mediaType="movie" />
      <ContentRow title={t.content.highestRated} items={topRated as never[]} variant="standard" mediaType="movie" />
      <ContentRow title={t.content.arabicMovies} items={arabic as never[]} variant="standard" mediaType="movie" />
      <ContentRow title={t.content.actionMovies} items={action as never[]} variant="numbered" mediaType="movie" />
    </div>
  )
}
