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
}

interface ContentCardProps {
  item: ContentItem
  mediaType: 'movie' | 'tv'
  variant: 'standard' | 'large' | 'numbered' | 'continue'
  index?: number
  progressPercent?: number
}

export function ContentCard({ item, mediaType, variant, index = 0, progressPercent }: ContentCardProps) {
  const [hovered, setHovered] = useState(false)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { t } = useT()
  const title = item.title || item.name || ''
  const year = formatYear(item.release_date || item.first_air_date || '')
  const detailUrl = `/${mediaType === 'tv' ? 'series' : 'movie'}/${item.id}`
  const watchUrl = `/watch/${item.id}?type=${mediaType}`

  const isLarge = variant === 'large'
  const imgPath = isLarge ? item.backdrop_path : item.poster_path
  const imgSize = isLarge ? 'w780' : 'w500'
  const aspectRatio = isLarge ? 'aspect-video' : 'aspect-[2/3]'

  function onMouseEnter() {
    hoverTimeout.current = setTimeout(() => setHovered(true), 300)
  }

  function onMouseLeave() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    setHovered(false)
  }

  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Numbered overlay */}
      {variant === 'numbered' && (
        <div className="absolute -right-3 bottom-0 z-10 pointer-events-none select-none number-overlay leading-none">
          {(index + 1).toLocaleString('ar-SA')}
        </div>
      )}

      {/* Card */}
      <Link href={detailUrl}>
        <div className={`relative ${aspectRatio} rounded-xl overflow-hidden bg-[#141414] group cursor-pointer`}>
          <Image
            src={getTMDBImageUrl(imgPath, imgSize as 'w500' | 'w780')}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={isLarge ? '(max-width: 768px) 90vw, 300px' : '(max-width: 768px) 45vw, 160px'}
          />
          {/* Hover gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Rating badge */}
          <div className="absolute top-2 start-2 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-xs text-[#F5A623] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            ★ {formatRating(item.vote_average)}
          </div>

          {/* Progress bar */}
          {variant === 'continue' && progressPercent !== undefined && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
              <div
                className="h-full bg-[#E50914] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </Link>

      {/* Title */}
      <p className="mt-2 text-xs text-[#B3B3B3] truncate font-medium px-0.5">
        {title}
      </p>

      {/* Hover Preview Card */}
      <AnimatePresence>
        {hovered && item.backdrop_path && (
          <motion.div
            {...scaleIn}
            transition={{ duration: 0.2 }}
            className="absolute z-50 top-0 -translate-y-4 left-1/2 -translate-x-1/2 w-72 glass rounded-xl overflow-hidden shadow-2xl pointer-events-auto"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {/* Backdrop */}
            <div className="relative aspect-video">
              <Image
                src={getTMDBImageUrl(item.backdrop_path, 'w780')}
                alt={title}
                fill
                className="object-cover"
                sizes="288px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/90 to-transparent" />
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-bold text-sm mb-1 leading-tight">{title}</h3>
              <div className="flex items-center gap-2 text-xs text-[#B3B3B3] mb-3">
                <span className="text-[#F5A623]">★ {formatRating(item.vote_average)}</span>
                <span>•</span>
                <span>{year}</span>
              </div>
              <p className="text-xs text-[#B3B3B3] line-clamp-2 leading-relaxed mb-4">{item.overview}</p>

              <div className="flex gap-2">
                <Link
                  href={watchUrl}
                  className="flex-1 bg-white text-black text-xs font-bold py-2 rounded-lg text-center hover:bg-white/90 transition-colors flex items-center justify-center gap-1"
                >
                  ▶ {t.content.watchNow}
                </Link>
                <Link
                  href={detailUrl}
                  className="flex-1 bg-white/10 border border-white/20 text-white text-xs font-medium py-2 rounded-lg text-center hover:bg-white/20 transition-colors"
                >
                  {t.content.moreInfo}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
