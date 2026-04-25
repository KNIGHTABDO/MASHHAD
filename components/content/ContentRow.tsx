'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ContentCard } from './ContentCard'

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

interface ContentRowProps {
  title: string
  items: ContentItem[]
  variant: 'standard' | 'large' | 'numbered' | 'continue'
  mediaType: 'movie' | 'tv'
}

export function ContentRow({ title, items, variant, mediaType }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  if (!items.length) return null

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.8
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  const cardWidth = variant === 'large' ? 'w-72 flex-shrink-0' : variant === 'numbered' ? 'w-44 flex-shrink-0' : 'w-40 flex-shrink-0'

  return (
    <section className="px-4 sm:px-6 lg:px-8 group/row">
      <div className="max-w-[1400px] mx-auto">
        {/* Row header */}
        <div className="flex items-center justify-between mb-4">
          <motion.h2
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-lg font-bold text-white"
          >
            {title}
          </motion.h2>
        </div>

        {/* Scroll container */}
        <div className="relative">
          {/* Left arrow — RTL: right arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-full bg-gradient-to-l from-[#0A0A0A] to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full glass flex items-center justify-center text-white hover:scale-110 transition-transform">
                ‹
              </div>
            </button>
          )}

          {/* Right arrow — RTL: left arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-full bg-gradient-to-r from-[#0A0A0A] to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full glass flex items-center justify-center text-white hover:scale-110 transition-transform">
                ›
              </div>
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex gap-3 overflow-x-auto overflow-y-visible scrollbar-hide py-4 -my-4"
            style={{ transform: 'translateZ(0)' }}
          >
            {items.map((item, index) => (
              <div key={item.id} className={`${cardWidth} flex-shrink-0`}>
                <ContentCard
                  item={item}
                  mediaType={mediaType}
                  variant={variant}
                  index={index}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
