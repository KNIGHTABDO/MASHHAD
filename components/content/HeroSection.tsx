'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { getTMDBImageUrl, formatYear, formatRating } from '@/lib/utils/format'
import { fadeIn } from '@/lib/animations'
import { useT } from '@/lib/i18n/context'

interface HeroItem {
  id: number
  title?: string
  name?: string
  overview: string
  backdrop_path: string | null
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  genre_ids: number[]
  media_type?: string
}

interface HeroSectionProps {
  items: HeroItem[]
  mediaType?: 'movie' | 'tv'
}

export function HeroSection({ items, mediaType: defaultMediaType }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const { t, lang } = useT()
  const validItems = items.filter(i => i.backdrop_path)

  const next = useCallback(() => {
    setCurrentIndex(i => (i + 1) % validItems.length)
  }, [validItems.length])

  useEffect(() => {
    if (isHovered) return
    const timer = setInterval(next, 8000)
    return () => clearInterval(timer)
  }, [next, isHovered])

  // Preload the next slide's image so there's no black frame between transitions
  useEffect(() => {
    if (validItems.length < 2) return
    const nextIndex = (currentIndex + 1) % validItems.length
    const nextItem = validItems[nextIndex]
    if (nextItem?.backdrop_path) {
      const img = new window.Image()
      img.src = getTMDBImageUrl(nextItem.backdrop_path, 'w1280')
    }
  }, [currentIndex, validItems])

  if (!validItems.length) return null

  const item = validItems[currentIndex]
  const title = item.title || item.name || ''
  const year = formatYear(item.release_date || item.first_air_date || '')
  
  // Robust media type detection
  const resolvedMediaType = item.media_type || defaultMediaType || (item.first_air_date ? 'tv' : 'movie')
  const typeKey = resolvedMediaType === 'tv' ? 'series' : 'movie'
  const detailUrl = `/${typeKey}/${item.id}`
  const watchUrl = `/watch/${item.id}?type=${resolvedMediaType === 'tv' ? 'tv' : 'movie'}`

  return (
    <div
      className="relative h-[85vh] min-h-[500px] overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          {...fadeIn}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <Image
            src={getTMDBImageUrl(item.backdrop_path, 'w1280')}
            alt={title}
            fill
            priority
            className="object-cover object-top"
            sizes="100vw"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/80 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex items-end pb-44">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="max-w-2xl"
            >
              {/* Meta */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[#F5A623] text-sm font-medium">★ {formatRating(item.vote_average)}</span>
                <span className="text-[#666] text-sm">•</span>
                <span className="text-[#B3B3B3] text-sm">{year}</span>
                {resolvedMediaType === 'tv' && (
                  <>
                    <span className="text-[#666] text-sm">•</span>
                    {/* Use i18n instead of hardcoded language ternary */}
                    <span className="text-xs bg-[#1F1F1F] border border-[var(--border-visible)] px-2 py-0.5 rounded-md text-[#B3B3B3]">{t.content.series}</span>
                  </>
                )}
              </div>

              {/* Title */}
              <h1 className="text-[clamp(2rem,5vw,4rem)] font-black leading-tight mb-4 text-white drop-shadow-lg">
                {title}
              </h1>

              {/* Overview */}
              <p className="text-[#B3B3B3] text-base leading-relaxed mb-8 line-clamp-3 max-w-xl">
                {item.overview || (lang === 'ar' ? 'لا يوجد وصف متاح.' : 'No description available.')}
              </p>

              {/* CTAs */}
              <div className="flex items-center gap-4">
                <Link
                  href={watchUrl}
                  className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  <PlayIcon />
                  {t.content.watchNow}
                </Link>
                <Link
                  href={detailUrl}
                  className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/25 transition-all duration-200"
                >
                  <InfoIcon />
                  {t.content.moreInfo}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {validItems.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === currentIndex ? 24 : 6,
              height: 6,
              backgroundColor: i === currentIndex ? '#E50914' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
