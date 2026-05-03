'use client'

import { useState } from 'react'
import { TrailerModal } from './TrailerModal'

interface TrailerButtonProps {
  tmdbId: number
  type: 'movie' | 'tv'
  label: string
}

export function TrailerButton({ tmdbId, type, label }: TrailerButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-[#1F1F1F] text-white border border-white/10 font-bold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all hover:scale-[1.02] shadow-xl"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9v6l5-3-5-3z"/><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM5 19V5h14v14H5z"/></svg>
        {label}
      </button>

      <TrailerModal
        tmdbId={tmdbId}
        type={type}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
