'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { getTMDBImageUrl } from '@/lib/utils/format'
import { useT } from '@/lib/i18n/context'
import type { Episode } from '@/types/content'
import type { AniListTitle } from '@/lib/anime/anilist'
import { DownloadButton } from '@/components/content/DownloadButton'

export interface AnimeSeasonEntry {
  anilistId: number
  title: AniListTitle
  year: number | null
  coverImage: string | null
  bannerImage: string | null
  tmdbId: number | null
  tmdbSeasonNumber: number | null
  displaySeasonNumber: number
  episodesCount: number | null
  episodeOffset: number
}

interface AnimeSeasonListProps {
  seasons: AnimeSeasonEntry[]
}

function getSeasonTitle(title: AniListTitle, lang: 'ar' | 'en'): string {
  if (lang === 'en') return title.english || title.romaji || title.native || ''
  return title.romaji || title.english || title.native || ''
}

export function AnimeSeasonList({ seasons }: AnimeSeasonListProps) {
  const { t, lang } = useT()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)

  const selectedSeason = seasons[selectedIndex]

  useEffect(() => {
    let cancelled = false
    async function loadEpisodes() {
      if (!selectedSeason?.tmdbId || !selectedSeason.tmdbSeasonNumber) {
        setEpisodes([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`/api/tmdb/tv/${selectedSeason.tmdbId}/season/${selectedSeason.tmdbSeasonNumber}`)
        const data = await res.json()
        if (!cancelled) {
          let eps = data.episodes || []
          if (selectedSeason.episodeOffset > 1 || selectedSeason.episodesCount) {
            const start = selectedSeason.episodeOffset - 1
            const end = selectedSeason.episodesCount ? start + selectedSeason.episodesCount : undefined
            eps = eps.slice(start, end)
          }
          setEpisodes(eps)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setEpisodes([])
          setLoading(false)
        }
      }
    }

    loadEpisodes()
    return () => {
      cancelled = true
    }
  }, [selectedSeason])

  if (!seasons.length) return null

  return (
    <section className="mt-8 pb-8">
      <h2 className="text-xl font-bold mb-6">{t.content.seasons}</h2>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-2">
        {seasons.map((season, index) => (
          <button
            key={`season-${season.anilistId}-${index}`}
            onClick={() => setSelectedIndex(index)}
            className={`flex-shrink-0 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedIndex === index
                ? 'bg-white text-black'
                : 'bg-[#1F1F1F] text-[#B3B3B3] hover:text-white hover:bg-[#2A2A2A]'
            }`}
          >
            {t.content.season} {lang === 'ar'
              ? season.displaySeasonNumber.toLocaleString('ar-SA')
              : season.displaySeasonNumber}
          </button>
        ))}
      </div>

      {selectedSeason && (
        <div className="mb-4 text-sm text-[#B3B3B3]">
          {getSeasonTitle(selectedSeason.title, lang)}
          {selectedSeason.year ? ` • ${selectedSeason.year}` : ''}
        </div>
      )}

      {!selectedSeason?.tmdbId && (
        <div className="text-sm text-[#B3B3B3]">{t.content.seasonUnavailable}</div>
      )}

      {loading && selectedSeason?.tmdbId && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      )}

      {!loading && selectedSeason?.tmdbId && episodes.length === 0 && (
        <div className="text-sm text-[#B3B3B3]">{t.content.noEpisodesAvailable}</div>
      )}

      <AnimatePresence mode="wait">
        {!loading && episodes.length > 0 && (
          <motion.div
            key={selectedSeason?.tmdbSeasonNumber}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {episodes.map(ep => (
              <Link
                key={ep.id}
                href={`/watch/${selectedSeason?.tmdbId}?type=tv&season=${selectedSeason?.tmdbSeasonNumber}&episode=${ep.episode_number}`}
                className="flex items-center gap-4 p-3 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] transition-colors group"
              >
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#666] text-xs">{ep.episode_number}</span>
                    <h3 className="font-medium text-sm truncate">{ep.name}</h3>
                    {ep.runtime && (
                      <span className="text-[#666] text-xs flex-shrink-0">
                        {ep.runtime} {t.content.minutes}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#666] line-clamp-2 leading-relaxed">
                    {ep.overview || t.content.noDescription}
                  </p>
                </div>
                <div className="flex-shrink-0 relative z-10 px-2" onClick={e => e.preventDefault()}>
                  <DownloadButton
                    tmdbId={String(selectedSeason?.tmdbId)}
                    type="episode"
                    season={selectedSeason?.tmdbSeasonNumber || 1}
                    episode={ep.episode_number}
                    variant="icon"
                  />
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
