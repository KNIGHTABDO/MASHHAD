'use client'

import { useEffect, useState } from 'react'

interface WatchlistButtonProps {
  contentId: string
  contentType: 'movie' | 'series'
}

export function WatchlistButton({ contentId, contentType }: WatchlistButtonProps) {
  const [inList, setInList] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/watchlist?contentId=${contentId}`)
      .then(r => r.json())
      .then(d => setInList(d.inList))
      .catch(() => {})
  }, [contentId])

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType }),
      })
      const data = await res.json()
      setInList(data.action === 'added')
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`w-12 h-12 rounded-xl border flex items-center justify-center text-lg transition-all ${
        inList
          ? 'bg-[#E50914]/20 border-[#E50914] text-[#E50914] hover:bg-[#E50914]/30'
          : 'border-white/30 text-white hover:bg-white/10'
      } ${loading ? 'opacity-50' : ''}`}
      title={inList ? 'إزالة من القائمة' : 'إضافة للقائمة'}
    >
      {inList ? '✓' : '+'}
    </button>
  )
}
