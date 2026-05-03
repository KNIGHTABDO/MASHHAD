'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { getTMDBImageUrl, formatYear, formatRating } from '@/lib/utils/format'
import { scaleIn } from '@/lib/animations'
import { useT } from '@/lib/i18n/context'

interface ContentItem {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  overview: string
  detailUrl?: string
  watchUrl?: string
}

interface ContentCardProps {
  item: ContentItem
  mediaType: 'movie' | 'tv'
  variant: 'standard' | 'large' | 'numbered' | 'continue'
  index?: number
  progressPercent?: number
}

export function ContentCard({ item, mediaType: propMediaType, variant, index = 0, progressPercent }: ContentCardProps) {
  const [hovered, setHovered] = useState(false)
  const [trailerKey, setTrailerKey] = useState<string | null>(null)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { t, lang } = useT()
  const title = item.title || item.name || ''
  const year = formatYear(item.release_date || item.first_air_date || '')
  
  // Robust media type detection
  const mediaType = propMediaType || (item.first_air_date ? 'tv' : 'movie')
  const defaultDetailUrl = `/${mediaType === 'tv' ? 'series' : 'movie'}/${item.id}`
  const defaultWatchUrl = `/watch/${item.id}?type=${mediaType}`
  const detailUrl = item.detailUrl || defaultDetailUrl
  const watchUrl = item.watchUrl || defaultWatchUrl

  const isLarge = variant === 'large'
  const imgPath = isLarge ? item.backdrop_path : item.poster_path
  const imgSize = isLarge ? 'w780' : 'w500'
  const aspectRatio = isLarge ? 'aspect-video' : 'aspect-[2/3]'

  function onMouseEnter() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    hoverTimeout.current = setTimeout(async () => {
      setHovered(true)
      // Fetch trailer when hovered
      if (!trailerKey) {
        try {
          const res = await fetch(`/api/tmdb/${mediaType}/${item.id}/videos?lang=${lang}`)
          const data = await res.json()
          // Only take YouTube videos
          interface TMDBVideo {
            site: string
            type: string
            key: string
          }
          const trailer = data.results?.find((v: TMDBVideo) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || 
                          data.results?.find((v: TMDBVideo) => v.site === 'YouTube')
          if (trailer?.key) setTrailerKey(trailer.key)
        } catch { /* ignore */ }
      }
    }, 400)
  }

  function onMouseLeave() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    // 400ms grace period to move mouse between the base card and the preview card
    hoverTimeout.current = setTimeout(() => {
      setHovered(false)
    }, 400)
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15
      }
    }
  }

  return (
    <motion.div
      variants={itemVariants}
      className={`relative group/card ${hovered ? 'z-[100]' : 'z-0'}`}
      style={{ willChange: 'transform' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Numbered overlay */}
      {variant === 'numbered' && (
        <div className="absolute -inset-inline-end-4 bottom-0 z-10 pointer-events-none select-none number-overlay leading-none opacity-80 group-hover/card:opacity-100 transition-opacity">
          {(index + 1).toLocaleString('ar-SA')}
        </div>
      )}

      {/* Card */}
      <Link href={detailUrl}>
        <div 
          className={`relative ${aspectRatio} rounded-xl overflow-hidden bg-[#141414] cursor-pointer border border-white/5 transition-all duration-500 ${hovered ? 'border-[#E50914]/40 shadow-[0_0_20px_rgba(229,9,20,0.2)]' : ''}`}
        >
          <Image
            src={getTMDBImageUrl(imgPath, imgSize as 'w500' | 'w780')}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover/card:scale-110"
            sizes={isLarge ? '(max-width: 768px) 90vw, 300px' : '(max-width: 768px) 45vw, 160px'}
          />
          {/* Hover gradient & Play Icon - INSTANT on card hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#E50914] flex items-center justify-center text-white shadow-2xl scale-75 group-hover/card:scale-100 transition-transform duration-300">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
          </div>

          {/* Rating badge */}
          <div className="absolute top-2 start-2 bg-black/60 backdrop-blur-md rounded-md px-2 py-0.5 text-[10px] text-[#F5A623] font-bold opacity-0 group-hover/card:opacity-100 transition-opacity border border-white/10">
            ★ {formatRating(item.vote_average)}
          </div>

          {/* Progress bar */}
          {variant === 'continue' && progressPercent !== undefined && (
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/40 backdrop-blur-sm">
              <div
                className="h-full bg-[#E50914] transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </Link>

      {/* Title */}
      <p className="mt-2 text-xs text-[#B3B3B3] truncate font-medium px-0.5 group-hover/card:text-white transition-colors">
        {title}
      </p>

      {/* Hover Preview Card */}
      <AnimatePresence>
        {hovered && item.backdrop_path && (
          <motion.div
            {...scaleIn}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`absolute z-50 top-1/2 -translate-y-1/2 w-80 bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto
              ${index === 0 ? 'left-0' : (index === 1 ? 'left-0' : 'left-1/2 -translate-x-1/2')}
            `}
            style={{ willChange: 'transform, opacity' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {/* Backdrop / Video Trailer */}
            <div className="relative aspect-video bg-[#141414]">
              {/* YouTube Thumbnail as high-quality fallback/base */}
              <Image
                src={trailerKey 
                  ? `https://img.youtube.com/vi/${trailerKey}/maxresdefault.jpg` 
                  : getTMDBImageUrl(item.backdrop_path, 'w780')}
                alt={title}
                fill
                className="object-cover"
                sizes="320px"
              />
              
              {trailerKey && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                    className="w-full h-full scale-[1.35] opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]"
                    allow="autoplay; encrypted-media"
                  />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-2 start-3">
                 <div className="flex items-center gap-2">
                    <span className="bg-[#E50914] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">HD</span>
                    <span className="text-white text-[10px] font-bold drop-shadow-lg">{year}</span>
                 </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                 <h3 className="font-bold text-sm leading-tight text-white line-clamp-1">{title}</h3>
                 <span className="text-[#F5A623] text-xs font-bold">★ {formatRating(item.vote_average)}</span>
              </div>
              <p className="text-[11px] text-[#B3B3B3] line-clamp-3 leading-relaxed mb-5 h-12">
                {item.overview || 'لا يوجد ملخص متاح حالياً لهذا العمل.'}
              </p>

              <div className="flex gap-2">
                <Link
                  href={watchUrl}
                  className="flex-[1.5] bg-[#E50914] text-white text-xs font-bold py-2.5 rounded-lg text-center hover:bg-[#ff0f1b] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                  {t.content.watchNow}
                </Link>
                <Link
                  href={detailUrl}
                  className="flex-1 bg-white/10 border border-white/20 text-white text-xs font-medium py-2.5 rounded-lg text-center hover:bg-white/20 transition-all active:scale-95"
                >
                  {t.content.moreInfo}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
