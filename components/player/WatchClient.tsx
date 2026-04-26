'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '@/store/playerStore'
import { useT } from '@/lib/i18n/context'
import { createClient } from '@/lib/supabase/client'
import type { StreamResult } from '@/types/stream'
import type { Subtitle } from '@/types/subtitle'
import { PostPlaybackScreen } from './PostPlaybackScreen'

interface WatchClientProps {
  contentId: string
  type: 'movie' | 'tv'
  season?: number
  episode?: number
  profileId: string | null
  initialProgress: number
}

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}


interface Segments {
  intro: { start_sec: number; end_sec: number } | null
  outro: { start_sec: number; end_sec: number } | null
}

export function WatchClient({ contentId, type, season, episode, profileId, initialProgress }: WatchClientProps) {
  const router = useRouter()
  const { t } = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const hasResumed = useRef(false)
  const hlsRef = useRef<any>(null)
  const trackRef = useRef<HTMLTrackElement>(null)
  const subtitleBlobUrl = useRef<string | null>(null)
  const playPromiseRef = useRef<Promise<void> | null>(null)

  // Safe play/pause to avoid AbortError
  const safePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const p = video.play()
    if (p) {
      playPromiseRef.current = p
      p.catch(() => {}).finally(() => { playPromiseRef.current = null })
    }
  }, [])

  const safePause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (playPromiseRef.current) {
      playPromiseRef.current.then(() => video.pause()).catch(() => {})
    } else {
      video.pause()
    }
  }, [])

  const safeToggle = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) safePlay()
    else safePause()
  }, [safePlay, safePause])

  const [streams, setStreams] = useState<StreamResult[]>([])
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [serverMenuOpen, setServerMenuOpen] = useState(false)
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [activeSub, setActiveSub] = useState<Subtitle | null>(null)
  const [subsLoading, setSubsLoading] = useState(false)
  
  const [segments, setSegments] = useState<Segments | null>(null)
  const [showSkipIntro, setShowSkipIntro] = useState(false)
  const [showNextEpisodeBtn, setShowNextEpisodeBtn] = useState(false)
  const [isEnded, setIsEnded] = useState(false)

  const { volume, setVolume, playbackRate, setPlaybackRate } = usePlayerStore()

  // Track the absolute progress to keep it synced across stream/server changes
  const lastKnownTime = useRef(initialProgress || 0)
  const previousStreamIndex = useRef(currentStreamIndex)

  // --- Supabase sync ---
  const syncProgress = useCallback(async (time?: number, embedDuration?: number) => {
    if (!profileId) return
    const isEmbed = streams[currentStreamIndex]?.type === 'embed'
    const video = videoRef.current
    
    if (!video && !isEmbed) return

    const prog = time ?? (video ? Math.floor(video.currentTime) : 0)
    const dur = embedDuration ?? (video ? Math.floor(video.duration) : 0)
    
    if (prog < 2) return

    const supabase = createClient()
    const row: Record<string, unknown> = {
      profile_id: profileId,
      content_id: contentId,
      content_type: type === 'tv' ? 'episode' : 'movie',
      progress_seconds: prog,
      duration_seconds: dur || 0,
      completed: dur > 0 && prog >= dur - 120,
      watched_at: new Date().toISOString(),
    }
    if (type === 'tv') {
      row.season_number = season ?? null
      row.episode_number = episode ?? null
    }

    // Try update first, insert if no rows affected
    const { data } = await supabase
      .from('watch_history')
      .select('id')
      .eq('profile_id', profileId)
      .eq('content_id', contentId)
      .eq('content_type', type === 'tv' ? 'episode' : 'movie')
      .order('watched_at', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      await supabase.from('watch_history').update(row).eq('id', data[0].id)
    } else {
      await supabase.from('watch_history').insert(row)
    }
  }, [profileId, contentId, type, season, episode, streams, currentStreamIndex])

  // Start sync interval
  useEffect(() => {
    syncTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) syncProgress()
    }, 5000)
    return () => { if (syncTimer.current) clearInterval(syncTimer.current) }
  }, [syncProgress])

  // --- VidSrc postMessage progress tracking ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MEDIA_DATA') {
        const mediaData = event.data.data;
        if (mediaData && mediaData.progress && typeof mediaData.progress.watched === 'number') {
           const duration = mediaData.progress.duration || mediaData.progress.total || 0;
           syncProgress(mediaData.progress.watched, duration);
           lastKnownTime.current = mediaData.progress.watched;
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [syncProgress]);

  // Fetch IntroDB segments
  useEffect(() => {
    if (type !== 'tv') return
    fetch(`/api/segments?tmdb_id=${contentId}&type=tv&season=${season}&episode=${episode}`)
      .then(res => res.json())
      .then(data => {
        setSegments({
          intro: data.intro || null,
          outro: data.outro || null,
        })
      })
      .catch(() => {})
  }, [contentId, type, season, episode])

  // --- Fetch subtitles (default: Arabic) ---
  useEffect(() => {
    async function fetchSubs() {
      setSubsLoading(true)
      try {
        const params = new URLSearchParams({
          tmdbId: contentId,
          type: type === 'movie' ? 'movie' : 'episode',
          language: 'ar',
          ...(season && { season: season.toString() }),
          ...(episode && { episode: episode.toString() }),
        })
        const res = await fetch(`/api/subtitles/search?${params}`)
        const data = await res.json()
        if (data.subtitles?.length > 0) {
          // Sort by download count (community ranking proxy)
          const sorted = [...data.subtitles].sort((a: Subtitle, b: Subtitle) => b.downloadCount - a.downloadCount)
          setSubtitles(sorted)
          // Auto-select top-ranked subtitle
          loadSubtitle(sorted[0])
        }
      } catch (err) {
        console.error('[Subtitles fetch]', err)
      } finally {
        setSubsLoading(false)
      }
    }
    fetchSubs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, type, season, episode])

  // --- Load a subtitle into the video track ---
  async function loadSubtitle(sub: Subtitle) {
    try {
      const res = await fetch('/api/subtitles/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: sub.fileId }),
      })
      const data = await res.json()
      if (!data.vttContent) return

      // Revoke old blob
      if (subtitleBlobUrl.current) URL.revokeObjectURL(subtitleBlobUrl.current)

      const blob = new Blob([data.vttContent], { type: 'text/vtt' })
      const url = URL.createObjectURL(blob)
      subtitleBlobUrl.current = url

      const video = videoRef.current
      if (!video) return

      // Remove existing tracks
      const existing = video.querySelectorAll('track')
      existing.forEach(t => t.remove())

      // Add new track
      const track = document.createElement('track')
      track.kind = 'subtitles'
      track.label = 'العربية'
      track.srclang = 'ar'
      track.src = url
      track.default = true
      video.appendChild(track)

      // Activate it
      if (video.textTracks[0]) {
        video.textTracks[0].mode = 'showing'
      }

      setActiveSub(sub)
    } catch (err) {
      console.error('[Subtitle load]', err)
    }
  }

  function disableSubtitles() {
    const video = videoRef.current
    if (video) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'hidden'
      }
    }
    setActiveSub(null)
  }

  // Sync on page leave
  useEffect(() => {
    const onLeave = () => syncProgress()
    window.addEventListener('beforeunload', onLeave)
    return () => { window.removeEventListener('beforeunload', onLeave); syncProgress() }
  }, [syncProgress])

  // --- Fetch streams ---
  useEffect(() => {
    async function fetchStreams() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          tmdbId: contentId,
          type: type === 'movie' ? 'movie' : 'episode',
          ...(season && { season: season.toString() }),
          ...(episode && { episode: episode.toString() }),
        })
        const res = await fetch(`/api/stream/resolve?${params}`)
        const data = await res.json()
        if (data.streams?.length > 0) {
          setStreams(data.streams)
          // Always prefer Direct streams first. If the browser cannot play MKV natively
          // (and the user doesn't have the extension), the video onError handler will
          // automatically trigger tryNextStream() and eventually fall back to HLS.
          const directIdx = data.streams.findIndex((s: StreamResult) => s.label?.includes('Direct'))
          if (directIdx >= 0) {
            setCurrentStreamIndex(directIdx)
          } else {
            setCurrentStreamIndex(0)
          }
        } else {
          setError(t.errors.noStreams)
        }
      } catch {
        setError(t.errors.streamFailed)
      } finally {
        setLoading(false)
      }
    }
    fetchStreams()
  }, [contentId, type, season, episode, t])

  // --- Load video source ---
  useEffect(() => {
    const cs = streams[currentStreamIndex]
    if (!cs || !videoRef.current) return
    const video = videoRef.current
    video.volume = volume
    video.playbackRate = playbackRate

    // Destroy previous HLS instance
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }

    if (cs.type === 'hls' && cs.url.includes('.m3u8')) {
      import('hls.js').then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true })
          hls.loadSource(cs.url)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => safePlay())
          hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) tryNextStream() })
          hlsRef.current = hls
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = cs.url
          safePlay()
        }
      })
    } else {
      video.src = cs.url
      safePlay()
    }

    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams, currentStreamIndex])

  // --- Cross-Server stream switching sync ---
  useEffect(() => {
    if (previousStreamIndex.current !== currentStreamIndex) {
      previousStreamIndex.current = currentStreamIndex
      hasResumed.current = false // Allow seeking to lastKnownTime on new stream
    }
  }, [currentStreamIndex])

  // --- Resume playback ---
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onReady = () => {
      if (!hasResumed.current && lastKnownTime.current > 0) {
        video.currentTime = lastKnownTime.current
        hasResumed.current = true
      }
    }
    video.addEventListener('canplay', onReady)
    return () => video.removeEventListener('canplay', onReady)
  }, [currentStreamIndex])

  // --- Time tracking ---
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => { 
      if (!isSeeking) {
        setCurrentTime(video.currentTime)
        if (video.currentTime > 0) lastKnownTime.current = video.currentTime
        
        // Check segments
        if (segments?.intro) {
          setShowSkipIntro(video.currentTime >= segments.intro.start_sec && video.currentTime <= segments.intro.end_sec)
        }
        if (segments?.outro) {
          setShowNextEpisodeBtn(video.currentTime >= segments.outro.start_sec)
        } else if (video.duration > 0 && video.currentTime >= video.duration - 30) {
          // Fallback: show next episode button 30s before end if no outro segment
          setShowNextEpisodeBtn(true)
        } else {
          setShowNextEpisodeBtn(false)
        }
      }
    }
    const onDur = () => setDuration(video.duration)
    const onBuf = () => {
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1))
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => { setIsPlaying(false); syncProgress() }
    const onEnded = () => setIsEnded(true)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('durationchange', onDur)
    video.addEventListener('progress', onBuf)
    video.addEventListener('playing', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('durationchange', onDur)
      video.removeEventListener('progress', onBuf)
      video.removeEventListener('playing', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
    }
  }, [isSeeking, syncProgress, segments])

  function tryNextStream() {
    if (currentStreamIndex < streams.length - 1) setCurrentStreamIndex(i => i + 1)
    else setError(t.errors.noStreams)
  }

  // --- Controls visibility ---
  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false)
    }, 3000)
  }, [])

  // --- Keyboard ---
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const video = videoRef.current
      if (!video) return
      switch (e.code) {
        case 'Space': e.preventDefault(); safeToggle(); break
        case 'ArrowRight': video.currentTime += 10; break
        case 'ArrowLeft': video.currentTime -= 10; break
        case 'ArrowUp': e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); setVolume(video.volume); break
        case 'ArrowDown': e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); setVolume(video.volume); break
        case 'KeyF':
          document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()
          break
        case 'KeyM': video.muted = !video.muted; break
      }
      showControls()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showControls, setVolume])

  useEffect(() => {
    const cb = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', cb)
    return () => document.removeEventListener('fullscreenchange', cb)
  }, [])

  // --- Progress bar interaction ---
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect()
    if (!rect || !videoRef.current) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    videoRef.current.currentTime = pct * duration
  }

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverTime(pct * duration)
    setHoverX(e.clientX - rect.left)
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0
  const cs = streams[currentStreamIndex]

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={`relative bg-black flex-1 flex flex-col select-none ${isFullscreen ? 'h-screen' : 'h-[100vh]'}`}
      onMouseMove={showControls}
      onTouchStart={showControls}
      style={{ cursor: controlsVisible ? 'default' : 'none' }}
    >
      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#B3B3B3]">جاري البحث عن روابط المشاهدة...</p>
            <p className="text-[#444] text-sm mt-1">قد يستغرق هذا بضع ثوانٍ</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="text-center max-w-md px-6">
            <div className="text-5xl mb-4">😔</div>
            <h2 className="text-xl font-bold mb-2">تعذّر تشغيل المحتوى</h2>
            <p className="text-[#B3B3B3] mb-6">{error}</p>
            <button onClick={() => router.back()} className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors">العودة</button>
          </div>
        </div>
      )}

      {/* Video or Embed */}
      {cs?.type === 'embed' ? (
        <iframe 
          src={cs.url} 
          width="100%"
          height="100%"
          className="absolute inset-0 w-full h-full border-0 bg-black z-10"
          allowFullScreen
          referrerPolicy="origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        />
      ) : (
        <video ref={videoRef} className="w-full h-full object-contain bg-black" onError={tryNextStream} playsInline controls={false}>
          <track ref={trackRef} kind="subtitles" default />
        </video>
      )}

      {/* Post Playback Screen */}
      {isEnded && (
        <PostPlaybackScreen 
          type={type === 'movie' ? 'movie' : 'tv'}
          seriesId={contentId}
          currentSeason={season}
          currentEpisode={episode}
          autoPlayNext={true} // Defaulting to true for now
        />
      )}

      {/* Skip Intro Button */}
      {showSkipIntro && !isEnded && (
        <div className="absolute bottom-32 right-8 z-40">
          <button 
            onClick={() => {
              if (videoRef.current && segments?.intro) {
                videoRef.current.currentTime = segments.intro.end_sec
              }
            }}
            className="bg-white text-black font-bold px-6 py-2 rounded-xl hover:bg-white/90 hover:scale-105 transition-all shadow-2xl"
          >
            {t.nav?.skipIntro || (lang === 'ar' ? 'تخطي المقدمة' : 'Skip Intro')}
          </button>
        </div>
      )}

      {/* Next Episode Button */}
      {showNextEpisodeBtn && !isEnded && type === 'tv' && (
        <div className="absolute bottom-32 right-8 z-40 flex gap-4">
          <button 
            onClick={() => setIsEnded(true)}
            className="bg-white text-black font-bold px-6 py-2 rounded-xl hover:bg-white/90 hover:scale-105 transition-all shadow-2xl"
          >
            {lang === 'ar' ? 'الحلقة القادمة' : 'Next Episode'}
          </button>
        </div>
      )}

      {/* Controls */}
      <AnimatePresence>
        {controlsVisible && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute inset-0 flex flex-col justify-between ${cs?.type === 'embed' ? 'pointer-events-none z-20' : ''}`}
          >
            {/* Top bar */}
            <div className={`bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center gap-3 ${cs?.type === 'embed' ? 'pointer-events-auto' : ''}`}>
              <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="flex-1" />
              {/* Subtitle selector (hide for embed) */}
              {cs?.type !== 'embed' && (
                <div className="relative">
                  <button
                    onClick={() => { setSubtitleMenuOpen(s => !s); setServerMenuOpen(false) }}
                    className={`px-4 py-2 rounded-full backdrop-blur-md text-sm hover:bg-white/20 transition-all flex items-center gap-2 ${activeSub ? 'bg-[#E50914]/30 text-white' : 'bg-white/10 text-white'}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 12h4m-2 3h6"/></svg>
                    {activeSub ? 'العربية' : t.player.noSubtitles}
                  </button>
                  <AnimatePresence>
                    {subtitleMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute right-0 top-12 w-72 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-50 border border-white/10 max-h-80 overflow-y-auto"
                      >
                        <div className="px-4 py-2 text-xs text-[#666] uppercase tracking-wider border-b border-white/10">الترجمة</div>
                        <button
                          onClick={() => { disableSubtitles(); setSubtitleMenuOpen(false) }}
                          className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center gap-2 ${!activeSub ? 'bg-[#E50914]/20 text-white' : 'text-[#B3B3B3] hover:bg-white/5 hover:text-white'}`}
                        >
                          {!activeSub && <span className="w-2 h-2 rounded-full bg-[#E50914]" />}
                          بدون ترجمة
                        </button>
                        {subsLoading && <div className="px-4 py-3 text-sm text-[#666]">جاري البحث...</div>}
                        {subtitles.map((s, i) => (
                          <button
                            key={s.fileId}
                            onClick={() => { loadSubtitle(s); setSubtitleMenuOpen(false) }}
                            className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center justify-between gap-2 ${activeSub?.fileId === s.fileId ? 'bg-[#E50914]/20 text-white' : 'text-[#B3B3B3] hover:bg-white/5 hover:text-white'}`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              {activeSub?.fileId === s.fileId && <span className="w-2 h-2 rounded-full bg-[#E50914] flex-shrink-0" />}
                              <span className="truncate">{s.uploaderName}</span>
                              {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E50914]/30 text-[#E50914] flex-shrink-0">★ الأفضل</span>}
                            </span>
                            <span className="text-xs text-[#666] flex-shrink-0">⬇ {s.downloadCount}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {/* Server selector */}
              <div className="relative">
                <button
                  onClick={() => { setServerMenuOpen(s => !s); setSubtitleMenuOpen(false) }}
                  className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm hover:bg-white/20 transition-all flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="18" r="1" fill="currentColor"/></svg>
                  {cs?.label || t.player.servers}
                </button>
                <AnimatePresence>
                  {serverMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 top-12 w-64 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-50 border border-white/10"
                    >
                      <div className="px-4 py-2 text-xs text-[#666] uppercase tracking-wider border-b border-white/10">Available Streams</div>
                      {streams.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { setCurrentStreamIndex(i); setServerMenuOpen(false) }}
                          className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center justify-between gap-2 ${
                            i === currentStreamIndex ? 'bg-[#E50914]/20 text-white' : 'text-[#B3B3B3] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {i === currentStreamIndex && <span className="w-2 h-2 rounded-full bg-[#E50914] animate-pulse" />}
                            {s.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{s.quality}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Center play/pause */}
            {cs?.type !== 'embed' && (
              <div className="flex-1 flex items-center justify-center" onClick={safeToggle}>
                <motion.div whileTap={{ scale: 0.85 }} className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-black/60 transition-all">
                  {isPlaying ? (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><polygon points="6,4 20,12 6,20"/></svg>
                  )}
                </motion.div>
              </div>
            )}

            {/* Bottom controls */}
            {cs?.type !== 'embed' && (
              <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-16 z-20 relative">
                {/* Progress bar */}
                <div className="group relative mb-3">
                  {/* Hover tooltip */}
                  {hoverTime !== null && (
                    <div className="absolute bottom-8 px-2 py-1 bg-black/90 rounded text-xs text-white pointer-events-none transform -translate-x-1/2 z-10" style={{ left: hoverX }}>
                      {formatTime(hoverTime)}
                    </div>
                  )}
                  <div
                    ref={progressBarRef}
                    className="relative w-full h-1 group-hover:h-2 bg-white/20 rounded-full cursor-pointer transition-all duration-200"
                    onClick={handleProgressClick}
                    onMouseMove={handleProgressHover}
                    onMouseLeave={() => setHoverTime(null)}
                  >
                    {/* Buffered */}
                    <div className="absolute top-0 left-0 h-full bg-white/30 rounded-full pointer-events-none" style={{ width: `${bufPct}%` }} />
                    {/* Progress */}
                    <div className="absolute top-0 left-0 h-full bg-[#E50914] rounded-full pointer-events-none" style={{ width: `${pct}%` }} />
                    {/* Thumb */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 group-hover:w-4 group-hover:h-4 bg-[#E50914] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
                      style={{ left: `calc(${pct}% - 6px)` }}
                    />
                  </div>
                </div>

                {/* Time + buttons */}
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button onClick={safeToggle} className="w-9 h-9 flex items-center justify-center text-white hover:text-[#E50914] transition-colors">
                    {isPlaying ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
                    )}
                  </button>

                  {/* Seek back */}
                  <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10 }} className="w-9 h-9 flex items-center justify-center text-white hover:text-[#E50914] transition-colors" title="Rewind 10s">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.5 8L8 12l4.5 4"/><path d="M20 12a8 8 0 1 0-3 6.3"/><text x="12" y="16" fill="currentColor" fontSize="6" textAnchor="middle" stroke="none">10</text></svg>
                  </button>

                  {/* Seek forward */}
                  <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10 }} className="w-9 h-9 flex items-center justify-center text-white hover:text-[#E50914] transition-colors" title="Forward 10s">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11.5 8L16 12l-4.5 4"/><path d="M4 12a8 8 0 1 0 3 6.3"/><text x="12" y="16" fill="currentColor" fontSize="6" textAnchor="middle" stroke="none">10</text></svg>
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-1 group/vol">
                    <button onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted }} className="w-9 h-9 flex items-center justify-center text-white hover:text-[#E50914] transition-colors">
                      {volume > 0.5 ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                      ) : volume > 0 ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2"/></svg>
                      )}
                    </button>
                    <input
                      type="range" min={0} max={1} step={0.05} value={volume}
                      onChange={e => { const v = Number(e.target.value); setVolume(v); if (videoRef.current) videoRef.current.volume = v }}
                      className="w-0 group-hover/vol:w-20 transition-all duration-300 accent-[#E50914] cursor-pointer overflow-hidden"
                    />
                  </div>

                  {/* Time display */}
                  <span className="text-white/80 text-xs font-mono tabular-nums tracking-tight">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  <div className="flex-1" />

                  {/* Speed */}
                  <select
                    value={playbackRate}
                    onChange={e => { const r = Number(e.target.value); setPlaybackRate(r); if (videoRef.current) videoRef.current.playbackRate = r }}
                    className="bg-transparent text-white text-xs rounded px-2 py-1 outline-none hover:bg-white/10 transition-colors cursor-pointer appearance-none"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                      <option key={r} value={r} className="bg-black">{r}x</option>
                    ))}
                  </select>

                  {/* Fullscreen */}
                  <button
                    onClick={() => document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()}
                    className="w-9 h-9 flex items-center justify-center text-white hover:text-[#E50914] transition-colors"
                  >
                    {isFullscreen ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
