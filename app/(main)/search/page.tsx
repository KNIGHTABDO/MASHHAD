'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useT } from '@/lib/i18n/context'
import { getTMDBImageUrl, formatRating, formatYear } from '@/lib/utils/format'
import { fadeIn } from '@/lib/animations'

const SEARCH_HISTORY_KEY = 'mashhad-search-history'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function SearchContent() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv' | 'person'>('all')
  const [history, setHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)
  const { t } = useT()

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]')
      setHistory(saved)
    } catch { /* ignore */ }
    inputRef.current?.focus()
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { results: [] }
      const res = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(debouncedQuery)}`)
      return res.json()
    },
    enabled: debouncedQuery.length > 1,
  })

  const results = (data?.results || []).filter((r: { media_type: string }) => {
    if (filter === 'all') return true
    return r.media_type === filter
  })

  function handleSearch(q: string) {
    setQuery(q)
    if (q.trim()) {
      const newHistory = [q, ...history.filter(h => h !== q)].slice(0, 8)
      setHistory(newHistory)
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
    }
  }

  const filters = [
    { key: 'all', label: t.search.all },
    { key: 'movie', label: t.search.movies },
    { key: 'tv', label: t.search.series },
    { key: 'person', label: t.search.actors },
  ]

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#666]">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder={t.search.placeholder}
            className="w-full bg-[#141414] border border-[var(--border-visible)] rounded-2xl pr-12 pl-4 py-4 text-white text-lg placeholder-[#444] outline-none focus:border-[#0071E3] transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 left-4 flex items-center text-[#666] hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        {debouncedQuery && (
          <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className={`flex-shrink-0 px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f.key ? 'bg-white text-black' : 'bg-[#1F1F1F] text-[#B3B3B3] hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Empty / History */}
        {!debouncedQuery && (
          <div>
            {history.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">{t.search.recentSearches}</h2>
                  <button
                    onClick={() => { setHistory([]); localStorage.removeItem(SEARCH_HISTORY_KEY) }}
                    className="text-sm text-[#666] hover:text-[#E50914] transition-colors"
                  >
                    {t.search.clearHistory}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map(h => (
                    <button
                      key={h}
                      onClick={() => setQuery(h)}
                      className="px-4 py-2 rounded-xl bg-[#1F1F1F] text-[#B3B3B3] hover:text-white hover:bg-[#2A2A2A] transition-colors text-sm"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[2/3] skeleton rounded-xl" />
                <div className="mt-2 h-3 w-3/4 skeleton rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && debouncedQuery && results.length === 0 && (
          <motion.p {...fadeIn} className="text-[#666] text-center py-20">
            {t.search.noResults} &quot;{debouncedQuery}&quot;
          </motion.p>
        )}

        {!isLoading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4"
          >
            {results.map((item: {
              id: number
              title?: string
              name?: string
              poster_path: string | null
              media_type: string
              vote_average: number
              release_date?: string
              first_air_date?: string
            }) => {
              const t = item.title || item.name || ''
              const href = item.media_type === 'tv' ? `/series/${item.id}` : `/movie/${item.id}`
              return (
                <Link key={item.id} href={href} className="group">
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#141414]">
                    {item.poster_path ? (
                      <Image
                        src={getTMDBImageUrl(item.poster_path, 'w300')}
                        alt={t}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 30vw, (max-width: 1024px) 20vw, 160px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#444] text-3xl">🎬</div>
                    )}
                    {item.vote_average > 0 && (
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs text-[#F5A623]">
                        ★ {formatRating(item.vote_average)}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-[#B3B3B3] truncate group-hover:text-white transition-colors">{t}</p>
                  <p className="text-xs text-[#444]">{formatYear(item.release_date || item.first_air_date || '')}</p>
                </Link>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  const { t, lang } = useT()
  return (
    <Suspense fallback={<div className="min-h-screen pt-8 pb-20 flex justify-center">{t.content?.loading || (lang === 'ar' ? 'جاري التحميل...' : 'Loading...')}</div>}>
      <SearchContent />
    </Suspense>
  )
}
