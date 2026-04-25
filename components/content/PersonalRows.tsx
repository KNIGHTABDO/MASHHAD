'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getTMDBImageUrl } from '@/lib/utils/format'
import { useT } from '@/lib/i18n/context'

interface WatchItem {
  content_id: string
  content_type: string
  progress_seconds: number
  duration_seconds: number
  season_number?: number
  episode_number?: number
}

interface TMDBItem {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  backdrop_path: string | null
}

export function ContinueWatchingRow() {
  const [items, setItems] = useState<(WatchItem & { tmdb?: TMDBItem })[]>([])
  const { t, lang } = useT()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/continue-watching')
        const data = await res.json()
        if (!data.items?.length) return

        // Fetch TMDB metadata for each item
        const enriched = await Promise.all(
          data.items.slice(0, 12).map(async (item: WatchItem) => {
            try {
              const type = item.content_type === 'episode' ? 'tv' : 'movie'
              const tmdbRes = await fetch(`/api/tmdb/detail?id=${item.content_id}&type=${type}`)
              const tmdb = await tmdbRes.json()
              return { ...item, tmdb }
            } catch {
              return item
            }
          })
        )
        setItems(enriched.filter(i => i.tmdb?.poster_path))
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  if (!items.length) return null

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-lg font-bold text-white mb-4">{t.content.continueWatching}</h2>
        <div className="flex gap-3 overflow-x-auto overflow-y-visible scrollbar-hide py-4 -my-4">
          {items.map((item) => {
            const tmdb = item.tmdb!
            const title = tmdb.title || tmdb.name || ''
            const pct = item.duration_seconds > 0 ? (item.progress_seconds / item.duration_seconds) * 100 : 0
            const type = item.content_type === 'episode' ? 'tv' : 'movie'
            const watchUrl = type === 'tv'
              ? `/watch/${item.content_id}?type=tv&season=${item.season_number}&episode=${item.episode_number}`
              : `/watch/${item.content_id}?type=movie`

            return (
              <Link key={`${item.content_id}-${item.season_number}-${item.episode_number}`} href={watchUrl} className="w-36 flex-shrink-0 group">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#141414]">
                  <Image
                    src={getTMDBImageUrl(tmdb.poster_path, 'w500')}
                    alt={title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="144px"
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="black"><polygon points="6,4 20,12 6,20"/></svg>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                    <div className="h-full bg-[#E50914]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#B3B3B3] truncate font-medium">{title}</p>
                {item.content_type === 'episode' && (
                  <p className="text-[10px] text-[#666]">{lang === 'ar' ? 'م' : 'S'}{item.season_number} {lang === 'ar' ? 'ح' : 'E'}{item.episode_number}</p>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function MyListRow() {
  const [items, setItems] = useState<(TMDBItem & { content_type: string })[]>([])
  const { t } = useT()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/watchlist')
        const data = await res.json()
        if (!data.items?.length) return

        const enriched = await Promise.all(
          data.items.slice(0, 20).map(async (item: { content_id: string; content_type: string }) => {
            try {
              const type = item.content_type === 'series' ? 'tv' : 'movie'
              const tmdbRes = await fetch(`/api/tmdb/detail?id=${item.content_id}&type=${type}`)
              const tmdb = await tmdbRes.json()
              return { ...tmdb, content_type: item.content_type }
            } catch {
              return null
            }
          })
        )
        setItems(enriched.filter((i): i is TMDBItem & { content_type: string } => i?.poster_path))
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  if (!items.length) return null

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-lg font-bold text-white mb-4">{t.nav.watchlist}</h2>
        <div className="flex gap-3 overflow-x-auto overflow-y-visible scrollbar-hide py-4 -my-4">
          {items.map((item) => {
            const title = item.title || item.name || ''
            const type = item.content_type === 'series' ? 'tv' : 'movie'
            const detailUrl = `/${type === 'tv' ? 'series' : 'movie'}/${item.id}`

            return (
              <Link key={item.id} href={detailUrl} className="w-36 flex-shrink-0 group">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#141414]">
                  <Image
                    src={getTMDBImageUrl(item.poster_path, 'w500')}
                    alt={title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="144px"
                  />
                </div>
                <p className="mt-2 text-xs text-[#B3B3B3] truncate font-medium">{title}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
