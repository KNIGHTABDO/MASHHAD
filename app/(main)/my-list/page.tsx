'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '@/lib/i18n/context'
import { getTMDBImageUrl, formatRating } from '@/lib/utils/format'
import { fadeIn, scaleIn } from '@/lib/animations'

interface ListItem {
  content_id: string
  content_type: string
  tmdb?: {
    id: number
    title?: string
    name?: string
    poster_path: string | null
    vote_average: number
    release_date?: string
    first_air_date?: string
  }
}

export default function MyListPage() {
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const { t, lang } = useT()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/watchlist')
        const data = await res.json()
        if (!data.items?.length) {
          setLoading(false)
          return
        }

        setItems(data.items)
        setLoading(false)

        // Enrich with TMDB data
        data.items.forEach(async (item: ListItem) => {
          try {
            const type = item.content_type === 'series' ? 'tv' : 'movie'
            const tmdbRes = await fetch(`/api/tmdb/detail?id=${item.content_id}&type=${type}&lang=${lang}`)
            const tmdb = await tmdbRes.json()
            setItems(prev => {
              const next = [...prev]
              const targetIdx = next.findIndex(i => i.content_id === item.content_id)
              if (targetIdx !== -1) {
                next[targetIdx] = { ...next[targetIdx], tmdb }
              }
              return next
            })
          } catch { /* ignore */ }
        })
      } catch {
        setLoading(false)
      }
    }
    load()
  }, [lang])

  async function removeFromList(contentId: string, contentType: string) {
    try {
      setItems(prev => prev.filter(i => i.content_id !== contentId))
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType })
      })
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{t.nav.watchlist}</h1>
          <div className="w-12 h-1 bg-[#E50914] rounded-full" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[2/3] skeleton rounded-xl" />
                <div className="h-3 w-3/4 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div {...fadeIn} className="flex flex-col items-center justify-center py-40 text-[#666]">
            <span className="text-6xl mb-4">🔖</span>
            <p className="text-lg">{t.content.noResults}</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
            <AnimatePresence mode="popLayout">
              {items.map((item) => {
                const tmdb = item.tmdb
                const title = tmdb?.title || tmdb?.name || '...'
                const type = item.content_type === 'series' ? 'tv' : 'movie'
                const detailUrl = `/${type === 'tv' ? 'series' : 'movie'}/${item.content_id}`

                return (
                  <motion.div
                    key={item.content_id}
                    layout
                    {...scaleIn}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative"
                  >
                    <Link href={detailUrl} className="block">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#141414] border border-white/5 group-hover:border-white/20 transition-all duration-300 shadow-lg group-hover:shadow-[#E50914]/10">
                        {tmdb?.poster_path ? (
                          <Image
                            src={getTMDBImageUrl(tmdb.poster_path, 'w500')}
                            alt={title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 50vw, 200px"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">🎬</div>
                        )}
                        
                        {tmdb?.vote_average && tmdb.vote_average > 0 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-[#F5A623] font-bold">
                            ★ {formatRating(tmdb.vote_average)}
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-xs font-bold text-white truncate group-hover:text-[#E50914] transition-colors">{title}</p>
                    </Link>

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        removeFromList(item.content_id, item.content_type)
                      }}
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:bg-[#E50914] hover:border-[#E50914] hover:scale-110 z-20 shadow-xl"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
