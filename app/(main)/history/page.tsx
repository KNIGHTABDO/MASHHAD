'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '@/lib/i18n/context'
import { getTMDBImageUrl } from '@/lib/utils/format'
import { fadeIn, scaleIn } from '@/lib/animations'

interface WatchItem {
  content_id: string
  content_type: string
  progress_seconds: number
  duration_seconds: number
  season_number?: number
  episode_number?: number
  watched_at: string
  tmdb?: {
    id: number
    title?: string
    name?: string
    poster_path: string | null
    backdrop_path: string | null
  }
}

export default function HistoryPage() {
  const [items, setItems] = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const { t, lang } = useT()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/continue-watching')
        const data = await res.json()
        if (!data.items?.length) {
          setLoading(false)
          return
        }

        // Initialize with placeholders
        setItems(data.items)
        setLoading(false)

        // Enrich with TMDB data
        data.items.forEach(async (item: WatchItem) => {
          try {
            const type = item.content_type === 'episode' ? 'tv' : 'movie'
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

  async function clearItem(contentId: string) {
    try {
      setItems(prev => prev.filter(i => i.content_id !== contentId))
      await fetch(`/api/continue-watching?contentId=${contentId}`, { method: 'DELETE' })
    } catch { /* ignore */ }
  }

  async function clearAll() {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من مسح سجل المشاهدة بالكامل؟' : 'Are you sure you want to clear your entire watch history?')) return
    try {
      setItems([])
      await fetch('/api/continue-watching', { method: 'DELETE' })
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{t.nav.history}</h1>
            <div className="w-12 h-1 bg-[#E50914] rounded-full" />
          </div>
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-all border border-white/10"
            >
              {t.content.clearHistory}
            </button>
          )}
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
            <span className="text-6xl mb-4">⌛</span>
            <p className="text-lg">{t.content.noResults}</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
            <AnimatePresence mode="popLayout">
              {items.map((item) => {
                const tmdb = item.tmdb
                const title = tmdb?.title || tmdb?.name || '...'
                const pct = item.duration_seconds > 0 ? (item.progress_seconds / item.duration_seconds) * 100 : 0
                const type = item.content_type === 'episode' ? 'tv' : 'movie'
                const watchUrl = type === 'tv'
                  ? `/watch/${item.content_id}?type=tv&season=${item.season_number}&episode=${item.episode_number}`
                  : `/watch/${item.content_id}?type=movie`

                return (
                  <motion.div
                    key={`${item.content_id}-${item.season_number || ''}`}
                    layout
                    {...scaleIn}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative"
                  >
                    <Link href={watchUrl} className="block">
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
                        
                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-[#E50914] text-white flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                          <div className="h-full bg-[#E50914] shadow-[0_0_10px_#E50914]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-xs font-bold text-white truncate group-hover:text-[#E50914] transition-colors">{title}</p>
                        {item.content_type === 'episode' && (
                          <p className="text-[10px] text-[#666] mt-0.5">
                            {lang === 'ar' ? 'س' : 'S'}{item.season_number} {lang === 'ar' ? 'ح' : 'E'}{item.episode_number}
                          </p>
                        )}
                      </div>
                    </Link>

                    {/* Quick Delete */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        clearItem(item.content_id)
                      }}
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:bg-[#E50914] hover:border-[#E50914] hover:scale-110 z-20"
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
