import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { tmdb } from '@/lib/tmdb/client'
import { getTMDBImageUrl } from '@/lib/utils/format'
import { getServerT } from '@/lib/i18n/server'
import { ContentRow } from '@/components/content/ContentRow'
import type { Person } from '@/types/content'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PersonDetailPage({ params }: Props) {
  const { id } = await params
  const { t } = await getServerT()
  let person: Person

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    person = await (tmdb.person(id) as any)
  } catch {
    notFound()
  }

  const profileUrl = getTMDBImageUrl(person.profile_path, 'w500')
  
  // Combine and map cast credits
  const knownForItems = (person.combined_credits?.cast || [])
    .filter(c => c.poster_path)
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, 20)
    .map(c => ({
      id: c.id,
      title: c.media_type === 'movie' ? ('title' in c ? c.title : '') : ('name' in c ? c.name : ''),
      poster_path: c.poster_path,
      backdrop_path: c.backdrop_path,
      release_date: c.media_type === 'movie' ? ('release_date' in c ? c.release_date : '') : undefined,
      first_air_date: c.media_type === 'tv' ? ('first_air_date' in c ? c.first_air_date : '') : undefined,
      vote_average: c.vote_average || 0,
      media_type: c.media_type as 'movie' | 'tv',
      overview: c.overview,
    }))

  return (
    <div className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start mb-16">
          {/* Profile Photo */}
          <div className="flex-shrink-0 w-48 md:w-72 mx-auto md:mx-0">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl bg-[#141414]">
              {person.profile_path ? (
                <Image src={profileUrl} alt={person.name} fill className="object-cover" sizes="(max-width: 768px) 192px, 288px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-[#444]">👤</div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-black leading-tight mb-6">{person.name}</h1>

            <div className="space-y-4 text-sm text-[#E0E0E0] mb-8">
              {person.known_for_department && (
                <div className="flex gap-2">
                  <span className="font-semibold text-white w-24">{t.content.knownFor}:</span>
                  <span>{person.known_for_department}</span>
                </div>
              )}
              {person.birthday && (
                <div className="flex gap-2">
                  <span className="font-semibold text-white w-24">{t.content.born}:</span>
                  <span>{person.birthday}</span>
                </div>
              )}
              {person.place_of_birth && (
                <div className="flex gap-2">
                  <span className="font-semibold text-white w-24">{t.content.placeOfBirth}:</span>
                  <span>{person.place_of_birth}</span>
                </div>
              )}
              {person.deathday && (
                <div className="flex gap-2">
                  <span className="font-semibold text-white w-24">{t.content.died}:</span>
                  <span>{person.deathday}</span>
                </div>
              )}
            </div>

            {person.biography && (
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white mb-2">{t.content.biography}</h2>
                <div className="text-[#B3B3B3] leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                  {person.biography}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Known For Row */}
        {knownForItems.length > 0 && (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8">
             <ContentRow
                title={t.content.knownFor}
                items={knownForItems}
                variant="standard"
                mediaType="movie" /* ContentCard reads item.mediaType internally for mixed rows if passed, but mediaType is required by prop. We pass movie but cards will route properly if we adapt ContentCard */
              />
          </div>
        )}
      </div>
    </div>
  )
}
