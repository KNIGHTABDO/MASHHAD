'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getTMDBImageUrl } from '@/lib/utils/format'
import { useT } from '@/lib/i18n/context'
import { ContentRow } from './ContentRow'

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

// Skeleton card placeholder
function SkeletonCard() {
  return (
    <div className="w-36 flex-shrink-0">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden skeleton" />
      <div className="mt-2 h-3 rounded skeleton w-3/4" />
    </div>
  )
}

export function ContinueWatchingRow() {
  const [items, setItems] = useState<(WatchItem & { tmdb?: TMDBItem })[]>([])
  const [loading, setLoading] = useState(true)
  const { t, lang } = useT()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/continue-watching?t=${Date.now()}`)
        const data = await res.json()
        if (!data.items?.length) {
          setLoading(false)
          return
        }

        // Show skeleton immediately with placeholder items
        const placeholders = data.items.slice(0, 12).map((item: WatchItem) => item)
        setItems(placeholders)
        setLoading(false)

        // Enrich with TMDB data one-by-one so cards appear as they load
        // Pass lang so titles match the current UI language
        data.items.slice(0, 12).forEach(async (item: WatchItem, idx: number) => {
          try {
            const type = item.content_type === 'episode' ? 'tv' : 'movie'
            const tmdbRes = await fetch(`/api/tmdb/detail?id=${item.content_id}&type=${type}&lang=${lang}`)
            const tmdb = await tmdbRes.json()
            if (tmdb?.poster_path) {
              setItems(prev => {
                const next = [...prev]
                next[idx] = { ...item, tmdb }
                return next
              })
            }
          } catch {
            // ignore individual failures
          }
        })
      } catch {
        setLoading(false)
      }
    }
    load()
  }, [lang])

  // Filter to only items that have TMDB data loaded
  const enriched = items.filter(i => i.tmdb?.poster_path)

  if (!loading && enriched.length === 0) return null

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-lg font-bold text-white mb-4">{t.content.continueWatching}</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-4 -my-4" style={{ overflowY: 'clip' }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : enriched.map((item) => {
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
                      <p className="text-[10px] text-[#666]">{t.content.season[0]}{item.season_number} {t.content.episode[0]}{item.episode_number}</p>
                    )}
                  </Link>
                )
              })
          }
        </div>
      </div>
    </section>
  )
}

export function MyListRow() {
  const [items, setItems] = useState<(TMDBItem & { content_type: string })[]>([])
  const [loading, setLoading] = useState(true)
  const { t, lang } = useT()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/watchlist?t=${Date.now()}`)
        const data = await res.json()
        if (!data.items?.length) {
          setLoading(false)
          return
        }

        // Show skeleton while loading
        setLoading(false)

        // Enrich with TMDB data staggered, passing lang for correct language titles
        data.items.slice(0, 20).forEach(async (item: { content_id: string; content_type: string }, idx: number) => {
          try {
            const type = item.content_type === 'series' ? 'tv' : 'movie'
            const tmdbRes = await fetch(`/api/tmdb/detail?id=${item.content_id}&type=${type}&lang=${lang}`)
            const tmdb = await tmdbRes.json()
            if (tmdb?.poster_path) {
              setItems(prev => {
                const next = [...prev]
                next[idx] = { ...tmdb, content_type: item.content_type }
                return next.filter(Boolean)
              })
            }
          } catch {
            // ignore
          }
        })
      } catch {
        setLoading(false)
      }
    }
    load()
  }, [lang])

  const enriched = items.filter(i => i?.poster_path)

  if (!loading && enriched.length === 0) return null

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-lg font-bold text-white mb-4">{t.nav.watchlist}</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-4 -my-4" style={{ overflowY: 'clip' }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : enriched.map((item) => {
                const title = item.title || item.name || ''
                const type = item.content_type === 'series' ? 'tv' : 'movie'
                const detailUrl = `/${type === 'tv' ? 'series' : 'movie'}/${item.id}`

                return (
                  <Link key={`${type}-${item.id}`} href={detailUrl} className="w-36 flex-shrink-0 group">
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
              })
          }
        </div>
      </div>
    </section>
  )
}

export function RecommendedRow() {
  const [items, setItems] = useState<TMDBItem[]>([])
  const [loading, setLoading] = useState(true)
  const [basedOnTitle, setBasedOnTitle] = useState('')
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie')
  const { t, lang } = useT()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/continue-watching?t=${Date.now()}`)
        const data = await res.json()
        const recentItem = data.items?.find((i: WatchItem) => i.progress_seconds > 0)
        
        if (!recentItem) {
          setLoading(false)
          return
        }

        const type = recentItem.content_type === 'episode' ? 'tv' : 'movie'
        setMediaType(type)
        
        // Fetch the title of the watched item
        const detailRes = await fetch(`/api/tmdb/detail?id=${recentItem.content_id}&type=${type}&lang=${lang}`)
        const detail = await detailRes.json()
        if (detail.title || detail.name) {
          setBasedOnTitle(detail.title || detail.name)
        }

        // Fetch recommendations via TMDB proxy
        const recRes = await fetch(`/api/tmdb/${type}/${recentItem.content_id}/recommendations?lang=${lang}`)
        const recData = await recRes.json()
        
        if (recData.results && recData.results.length > 0) {
          // Filter to items with posters
          setItems(recData.results.filter((i: TMDBItem) => i.poster_path).slice(0, 20))
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [lang])

  if (!loading && items.length === 0) return null

  const rowTitle = basedOnTitle ? `${t.content.becauseYouWatched || 'Because you watched'} ${basedOnTitle}` : (t.content.recommended || 'Recommended for You')

  if (loading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <h2 className="text-lg font-bold text-[#B3B3B3] mb-4">{t.content.loading}</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide py-4 -my-4" style={{ overflowY: 'clip' }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </section>
    )
  }

  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
  return <ContentRow title={rowTitle} items={items as any} variant="standard" mediaType={mediaType} />
}
