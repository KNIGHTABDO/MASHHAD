'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '@/lib/i18n/context'

interface TrailerModalProps {
  tmdbId: number
  type: 'movie' | 'tv'
  isOpen: boolean
  onClose: () => void
}

export function TrailerModal({ tmdbId, type, isOpen, onClose }: TrailerModalProps) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const { lang } = useT()

  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      async function fetchTrailer() {
        setLoading(true)
        try {
          const res = await fetch(`/api/tmdb/${type}/${tmdbId}/videos?lang=${lang}`)
          const data = await res.json()
          const trailer = data.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') || 
                          data.results?.find((v: any) => v.site === 'YouTube')
          if (trailer?.key) setTrailerKey(trailer.key)
        } catch { /* ignore */ } finally {
          setLoading(false)
        }
      }
      fetchTrailer()
    }
  }, [isOpen, tmdbId, type, lang])

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl aspect-video bg-[#0A0A0A] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-50 w-12 h-12 rounded-full bg-black/60 text-white hover:bg-[#E50914] transition-all flex items-center justify-center border border-white/10 shadow-2xl active:scale-90"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : trailerKey ? (
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#B3B3B3] font-bold">
                No Trailer Available
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
