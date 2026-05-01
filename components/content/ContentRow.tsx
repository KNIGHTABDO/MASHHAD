'use client'

import { useRef, useState, useCallback } from 'react'
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
  detailUrl?: string
  watchUrl?: string
}

interface ContentRowProps {
  title: string
  items: ContentItem[]
  variant: 'standard' | 'large' | 'numbered' | 'continue'
  mediaType: 'movie' | 'tv'
}

export function ContentRow({ title, items, variant, mediaType }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollStart, setCanScrollStart] = useState(false)
  const [canScrollEnd, setCanScrollEnd] = useState(true)
  const rafRef = useRef<number | null>(null)

  const onScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      const isRTL = document.documentElement.dir === 'rtl'
      
      if (isRTL) {
        // In RTL, scrollLeft is 0 at the start and negative as you scroll "forward" (physically left)
        setCanScrollStart(el.scrollLeft < -10)
        setCanScrollEnd(el.scrollLeft > -(el.scrollWidth - el.clientWidth - 10))
      } else {
        setCanScrollStart(el.scrollLeft > 10)
        setCanScrollEnd(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
      }
    })
  }, [])

  if (!items.length) return null

  function scroll(dir: 'start' | 'end') {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.8
    // In RTL, scrollLeft is negative or zero, but scrollBy handles it correctly
    el.scrollBy({ left: dir === 'start' ? -amount : amount, behavior: 'smooth' })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  }

  const cardWidth = variant === 'large' ? 'w-72 flex-shrink-0' : variant === 'numbered' ? 'w-44 flex-shrink-0' : 'w-40 flex-shrink-0'

  return (
    <section className="px-4 sm:px-6 lg:px-8 group/row">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <motion.h2
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-lg font-bold text-white border-r-4 border-[#E50914] pr-3"
          >
            {title}
          </motion.h2>
        </div>

        <div className="relative">
          {/* Back Arrow (Start) */}
          {canScrollStart && (
            <button
              onClick={() => scroll('start')}
              className="absolute inset-y-0 start-0 z-10 w-12 flex items-center justify-start opacity-0 group-hover/row:opacity-100 transition-all duration-300 bg-gradient-to-e from-[#0A0A0A] to-transparent"
            >
              <div className="w-9 h-9 rounded-full glass flex items-center justify-center text-white hover:scale-110 hover:bg-white/20 transition-all ml-1 shadow-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rtl:rotate-180"><path d="M15 18l-6-6 6-6"/></svg>
              </div>
            </button>
          )}

          {/* Forward Arrow (End) */}
          {canScrollEnd && (
            <button
              onClick={() => scroll('end')}
              className="absolute inset-y-0 end-0 z-10 w-12 flex items-center justify-end opacity-0 group-hover/row:opacity-100 transition-all duration-300 bg-gradient-to-s from-[#0A0A0A] to-transparent"
            >
              <div className="w-9 h-9 rounded-full glass flex items-center justify-center text-white hover:scale-110 hover:bg-white/20 transition-all mr-1 shadow-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rtl:rotate-180"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </button>
          )}

          <motion.div
            ref={scrollRef}
            onScroll={onScroll}
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "100px" }}
            className="flex gap-4 overflow-x-auto scrollbar-hide py-20 -my-20"
            style={{
              transform: 'translateZ(0)',
              scrollSnapType: 'x mandatory'
            }}
          >
            {items.map((item, index) => (
              <div key={item.id} className={`${cardWidth} flex-shrink-0 scroll-snap-align-start`}>
                <ContentCard
                  item={item}
                  mediaType={mediaType}
                  variant={variant}
                  index={index}
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
