import { tmdb } from '@/lib/tmdb/client'
import { ContentRow } from '@/components/content/ContentRow'
import { getServerT } from '@/lib/i18n/server'

export default async function SeriesPage() {
  const { t, lang } = await getServerT()
  const [popular, topRated, arabic, drama] = await Promise.all([
    tmdb.popular('tv').then((d: { results: unknown[] }) => d.results?.slice(0, 20) || []).catch(() => []),
    tmdb.topRated('tv').then((d: { results: unknown[] }) => d.results?.slice(0, 20) || []).catch(() => []),
    tmdb.discover('tv', { with_original_language: 'ar', sort_by: 'popularity.desc' }).then((d: { results: unknown[] }) => d.results?.slice(0, 20) || []).catch(() => []),
    tmdb.discover('tv', { with_genres: '18', sort_by: 'popularity.desc' }).then((d: { results: unknown[] }) => d.results?.slice(0, 20) || []).catch(() => []),
  ])

  return (
    <div className="min-h-screen pt-8 pb-20 space-y-10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <h1 className="text-3xl font-black mb-2">{t.nav.series}</h1>
        <div className="w-12 h-1 bg-[#E50914] rounded-full" />
      </div>
      <ContentRow title={lang === 'ar' ? 'الأكثر شعبية' : 'Most Popular'} items={popular as never[]} variant="large" mediaType="tv" />
      <ContentRow title={t.content.highestRated} items={topRated as never[]} variant="standard" mediaType="tv" />
      <ContentRow title={lang === 'ar' ? 'مسلسلات عربية' : 'Arabic Series'} items={arabic as never[]} variant="standard" mediaType="tv" />
      <ContentRow title={lang === 'ar' ? 'دراما' : 'Drama'} items={drama as never[]} variant="numbered" mediaType="tv" />
    </div>
  )
}
