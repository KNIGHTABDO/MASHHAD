'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { getTMDBImageUrl } from '@/lib/utils/format'
import { useT } from '@/lib/i18n/context'
import type { Season } from '@/types/content'
import { DownloadButton } from './DownloadButton'

interface EpisodeListProps {
  seriesId: string
  seasons: Season[]
}

export function EpisodeList({ seriesId, seasons }: EpisodeListProps) {
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]?.season_number ?? 1)
  const { t, lang } = useT()

  return (
    <section className="mt-8 pb-8">
      <h2 className="text-xl font-bold mb-6">{t.content.episodes}</h2>

      {/* Season Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-2">
        {seasons.map(season => (
          <button
            key={season.season_number}
            onClick={() => setSelectedSeason(season.season_number)}
            className={`flex-shrink-0 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedSeason === season.season_number
                ? 'bg-white text-black'
                : 'bg-[#1F1F1F] text-[#B3B3B3] hover:text-white hover:bg-[#2A2A2A]'
            }`}
          >
            {t.content.season} {lang === 'ar' ? season.season_number.toLocaleString('ar-SA') : season.season_number}
          </button>
        ))}
      </div>

      {/* Episodes */}
      <AnimatePresence mode="wait">
        <SeasonEpisodes key={selectedSeason} seriesId={seriesId} seasonNumber={selectedSeason} />
      </AnimatePresence>
    </section>
  )
}

function SeasonEpisodes({ seriesId, seasonNumber }: { seriesId: string; seasonNumber: number }) {
  const { lang } = useT()
  const [episodes, setEpisodes] = useState<Season['episodes']>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tmdb/tv/${seriesId}/season/${seasonNumber}`)
      .then(r => r.json())
      .then(data => {
        setEpisodes(data.episodes || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [seriesId, seasonNumber])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 skeleton rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-2"
    >
      {episodes?.map(ep => (
        <Link
          key={ep.id}
          href={`/watch/${seriesId}?type=tv&season=${seasonNumber}&episode=${ep.episode_number}`}
          className="flex items-center gap-4 p-3 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] transition-colors group"
        >
          {/* Thumbnail */}
          <div className="relative flex-shrink-0 w-32 aspect-video rounded-lg overflow-hidden bg-[#1F1F1F]">
            {ep.still_path ? (
              <Image
                src={getTMDBImageUrl(ep.still_path, 'w300')}
                alt={ep.name}
                fill
                className="object-cover"
                sizes="128px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#444]">🎬</div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <span className="text-black text-xs ml-0.5">▶</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#666] text-xs">{ep.episode_number}</span>
              <h3 className="font-medium text-sm truncate">{ep.name}</h3>
              {ep.runtime && (
                <span className="text-[#666] text-xs flex-shrink-0">{ep.runtime} {lang === 'ar' ? 'د' : 'min'}</span>
              )}
            </div>
            <p className="text-xs text-[#666] line-clamp-2 leading-relaxed">
              {ep.overview || (lang === 'ar' ? 'لا يوجد وصف.' : 'No description.')}
            </p>
          </div>
          <div className="flex-shrink-0 relative z-10 px-2" onClick={e => e.preventDefault()}>
            <DownloadButton 
              tmdbId={seriesId} 
              type="episode" 
              season={seasonNumber} 
              episode={ep.episode_number} 
              variant="icon" 
            />
          </div>
        </Link>
      ))}
    </motion.div>
  )
}
