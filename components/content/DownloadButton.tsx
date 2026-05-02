'use client'

import { useState, useRef, useEffect } from 'react'
import { useT } from '@/lib/i18n/context'
import type { StreamResult } from '@/types/stream'

interface DownloadButtonProps {
  tmdbId: string
  type: 'movie' | 'episode'
  season?: number
  episode?: number
  variant?: 'standard' | 'icon'
}

export function DownloadButton({ tmdbId, type, season, episode, variant = 'standard' }: DownloadButtonProps) {
  const { t } = useT()
  const [loading, setLoading] = useState(false)
  const [streams, setStreams] = useState<StreamResult[]>([])
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleDownloadClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    if (streams.length > 0) {
      setShowMenu(true)
      return
    }

    setLoading(true)
    try {
      const url = new URL('/api/stream/resolve', window.location.origin)
      url.searchParams.set('tmdbId', tmdbId)
      url.searchParams.set('type', type)
      if (season) url.searchParams.set('season', season.toString())
      if (episode) url.searchParams.set('episode', episode.toString())

      const res = await fetch(url.toString())
      const data = await res.json()
      
      const downloadableStreams = (data.streams || [])
        .filter((s: StreamResult) => s.isRealDebrid && s.variant === 'direct' && s.type === 'mp4')
      
      if (downloadableStreams.length === 0) {
        alert(t.content.noDownloadAvailable || 'No downloads available')
      } else {
        setStreams(downloadableStreams)
        setShowMenu(true)
      }
    } catch {
      alert(t.errors?.generic || 'Error fetching downloads')
    } finally {
      setLoading(false)
    }
  }

  function downloadStream(stream: StreamResult, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(false)
    window.open(stream.url, '_blank')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleDownloadClick}
        disabled={loading}
        className={
          variant === 'standard'
            ? "flex items-center gap-2 bg-white/10 border border-white/20 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-white/20 transition-all hover:scale-[1.02] disabled:opacity-50"
            : "w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/20 transition-all disabled:opacity-50"
        }
        title={t.content.download || 'Download'}
      >
        {variant === 'standard' ? (
          <>
            <span className="text-xl">⬇</span>
            {loading ? (t.content.resolvingDownload || 'Resolving...') : (t.content.download || 'Download')}
          </>
        ) : (
          <span className={loading ? 'animate-pulse' : ''}>⬇</span>
        )}
      </button>

      {showMenu && streams.length > 0 && (
        <div className={`absolute ${variant === 'icon' ? 'right-0' : 'left-0'} top-full mt-2 w-48 bg-[#141414] border border-[#333] rounded-xl shadow-2xl z-50 overflow-hidden`}>
          <div className="px-4 py-2 text-xs font-bold text-[#B3B3B3] bg-[#0A0A0A] border-b border-[#333]">
            {t.content.selectQuality || 'Select Quality'}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {streams.map((stream, i) => (
              <button
                key={i}
                onClick={(e) => downloadStream(stream, e)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-white/10 transition-colors flex justify-between items-center"
              >
                <span>{stream.quality || 'Auto'}</span>
                <span className="text-[#B3B3B3] text-xs">MKV/MP4</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
