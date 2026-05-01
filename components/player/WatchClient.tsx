'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

// ── Platform-aware stream selection ──────────────────────────────
function getPlayerConfig(streams: StreamResult[]): {
  stream: StreamResult
  playerType: 'native-hls' | 'hls.js' | 'dash.js' | 'direct'
} {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/Edg/.test(ua)
  const isAndroid = /Android/.test(ua)

  // Prefer liveMP4 for ALL mobile (fastest start, best compatibility)
  const liveMp4 = streams.find(s => s.label?.includes('LiveMP4'))
  if (liveMp4 && (isIOS || isSafari || isAndroid)) {
    return { stream: liveMp4, playerType: 'direct' }
  }

  // iOS Safari with HLS fallback
  if (isIOS || isSafari) {
    const hlsStream = streams.find(s => s.type === 'hls')
    if (hlsStream) return { stream: hlsStream, playerType: 'native-hls' }
    const anyHls = streams.find(s => s.url.includes('.m3u8'))
    if (anyHls) return { stream: anyHls, playerType: 'native-hls' }
    // Direct MP4 fallback
    const mp4 = streams.find(s => s.type === 'mp4' && !s.label?.includes('WebM'))
    if (mp4) return { stream: mp4, playerType: 'direct' }
  }

  // Android: prefer DASH, then HLS via hls.js
  if (isAndroid) {
    const dash = streams.find(s => s.type === 'dash')
    if (dash) return { stream: dash, playerType: 'dash.js' }
    const hls = streams.find(s => s.type === 'hls')
    if (hls) return { stream: hls, playerType: 'hls.js' }
  }

  // Desktop: HLS via hls.js (adaptive quality)
  const hls = streams.find(s => s.type === 'hls')
  if (hls) return { stream: hls, playerType: 'hls.js' }

  // Fallbacks
  const mp4 = streams.find(s => s.type === 'mp4' && !s.label?.includes('WebM'))
  if (mp4) return { stream: mp4, playerType: 'direct' }

  return { stream: streams[0], playerType: 'direct' }
}

// ── Resolve and retry ────────────────────────────────────────────
export function WatchClient({ contentId, type, season, episode, profileId, initialProgress }: WatchClientProps) {
  const router = useRouter()
  const { t, lang } = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const hasResumed = useRef(false)
  const hlsRef = useRef<import('hls.js').default | null>(null)
  const trackRef = useRef<HTMLTrackElement>(null)
  const subtitleBlobUrl = useRef<string | null>(null)
  const playPromiseRef = useRef<Promise<void> | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [activeSub, setActiveSub] = useState<Subtitle | null>(null)
  const [subsLoading, setSubsLoading] = useState(false)
  const [showAssWarning, setShowAssWarning] = useState(false)

  const [segments, setSegments] = useState<Segments | null>(null)
  const [showSkipIntro, setShowSkipIntro] = useState(false)
  const [showNextEpisodeBtn, setShowNextEpisodeBtn] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [isChangingStream, setIsChangingStream] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [hlsLevels, setHlsLevels] = useState<{ id: number, label: string }[]>([])
  const [currentLevel, setCurrentLevel] = useState<number>(-1)
  const [showLevelMenu, setShowLevelMenu] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [lastFallbackError, setLastFallbackError] = useState<string | null>(null)

  // Touch gesture state
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [touchStartTime, setTouchStartTime] = useState(0)
  const lastTapTime = useRef(0)
  const tapCount = useRef(0)

  // Refs for progress bar hover
  const hoverIndicatorRef = useRef<HTMLDivElement>(null)
  const hoverTooltipRef = useRef<HTMLDivElement>(null)
  const hoverRafRef = useRef<number | null>(null)

  const { volume, setVolume, playbackRate, setPlaybackRate } = usePlayerStore()

  const lastKnownTime = useRef(initialProgress || 0)
  const previousStreamIndex = useRef(currentStreamIndex)

  // ── Progress sync ────────────────────────────────────────────────
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

  useEffect(() => {
    syncTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) syncProgress()
    }, 5000)
    return () => { if (syncTimer.current) clearInterval(syncTimer.current) }
  }, [syncProgress])

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

  const currentFileName = streams[currentStreamIndex]?.fileName || ''

  // ── Fetch subtitles (Arabic + English) ───────────────────────────
  useEffect(() => {
    async function fetchSubs() {
      setSubsLoading(true)
      try {
        const streamFile = currentFileName
        const baseParams = {
          tmdbId: contentId,
          type: type === 'movie' ? 'movie' : 'episode',
          ...(season && { season: season.toString() }),
          ...(episode && { episode: episode.toString() }),
          ...(streamFile && { streamFile }),
        }

        const [resAr, resEn] = await Promise.all([
          fetch(`/api/subtitles/search?${new URLSearchParams({ ...baseParams, language: 'ar' })}`).then(r => r.ok ? r.json() : { subtitles: [] }).catch(() => ({ subtitles: [] })),
          fetch(`/api/subtitles/search?${new URLSearchParams({ ...baseParams, language: 'en' })}`).then(r => r.ok ? r.json() : { subtitles: [] }).catch(() => ({ subtitles: [] })),
        ])

        const allSubs: Subtitle[] = [
          ...(resAr.subtitles || []).map((s: Subtitle) => ({ ...s, language: 'ar' })),
          ...(resEn.subtitles || []).map((s: Subtitle) => ({ ...s, language: 'en' })),
        ]

        // Check for ASS/SSA subtitles that won't render properly
        const hasAss = allSubs.some(s => s.fileName?.toLowerCase().endsWith('.ass') || s.fileName?.toLowerCase().endsWith('.ssa'))
        if (hasAss && currentFileName.match(/\[\w+.*?(?:raw|r subs|vostfr)\]|\.ass$/i)) {
          setShowAssWarning(true)
        }

        setSubtitles(allSubs)
        if (resAr.subtitles?.length > 0) {
          loadSubtitle(resAr.subtitles[0])
        } else if (resEn.subtitles?.length > 0) {
          loadSubtitle(resEn.subtitles[0])
        }
      } catch (err) {
        console.error('[Subtitles fetch]', err)
      } finally {
        setSubsLoading(false)
      }
    }
    fetchSubs()
  }, [contentId, type, season, episode, currentStreamIndex, currentFileName])

  const manualOffsetMs = useRef(0)

  // ── Load a subtitle into the video track ─────────────────────────
  async function loadSubtitle(sub: Subtitle, extraOffsetMs?: number) {
    try {
      const res = await fetch('/api/subtitles/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: sub.fileId }),
      })
      const data = await res.json()
      if (!data.vttContent) return

      const communityOffset = sub.recommendedOffsetMs || 0
      const manual = extraOffsetMs ?? manualOffsetMs.current
      const totalOffset = communityOffset + manual

      let vttContent = data.vttContent
      if (totalOffset !== 0) {
        const { applyVttOffset } = await import('@/lib/subtitles/offset')
        vttContent = applyVttOffset(vttContent, totalOffset)
      }

      if (subtitleBlobUrl.current) URL.revokeObjectURL(subtitleBlobUrl.current)

      const blob = new Blob([vttContent], { type: 'text/vtt' })
      const url = URL.createObjectURL(blob)
      subtitleBlobUrl.current = url

      const video = videoRef.current
      if (!video) return

      const existing = video.querySelectorAll('track')
      existing.forEach(t => t.remove())

      const track = document.createElement('track')
      track.kind = 'subtitles'
      track.label = sub.language === 'ar' ? 'العربية' : sub.language === 'en' ? 'English' : sub.language
      track.srclang = sub.language
      track.src = url
      track.default = true
      video.appendChild(track)

      if (video.textTracks[0]) {
        video.textTracks[0].mode = 'showing'
      }

      setActiveSub(sub)
    } catch (err) {
      console.error('[Subtitle load]', err)
    }
  }

  const adjustSubtitleOffset = useCallback((deltaMs: number) => {
    manualOffsetMs.current += deltaMs
    if (activeSub) loadSubtitle(activeSub)
    if (activeSub?.fileId) {
      fetch('/api/subtitles/sync-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitle_file_id: activeSub.fileId,
          offset_ms: manualOffsetMs.current,
        }),
      }).catch(() => {})
    }
  }, [activeSub])

  function disableSubtitles() {
    const video = videoRef.current
    if (video) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'hidden'
      }
    }
    setActiveSub(null)
  }

  useEffect(() => {
    const onLeave = () => syncProgress()
    window.addEventListener('beforeunload', onLeave)
    return () => { window.removeEventListener('beforeunload', onLeave); syncProgress() }
  }, [syncProgress])

  // ── Fetch streams with platform-aware default ────────────────────
  const fetchStreams = useCallback(async () => {
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
        // Platform-aware default selection
        const cfg = getPlayerConfig(data.streams)
        const idx = data.streams.findIndex((s: StreamResult) => s.url === cfg.stream.url)
        setCurrentStreamIndex(idx >= 0 ? idx : 0)
      } else {
        setError(t.errors.noStreams)
      }
    } catch {
      setError(t.errors.streamFailed)
    } finally {
      setLoading(false)
    }
  }, [contentId, type, season, episode, t])

  useEffect(() => {
    fetchStreams()
  }, [fetchStreams])

  // ── Refresh a stream URL from the server ─────────────────────────
  const refreshStreamUrl = useCallback(async (): Promise<string | null> => {
    const cs = streams[currentStreamIndex]
    if (!cs?.rdFileId || !cs?.rdTorrentId) return null

    const isTranscode = cs.type === 'hls' || cs.type === 'dash' || cs.label?.includes('LiveMP4')
    try {
      const res = await fetch('/api/stream/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torrentId: cs.rdTorrentId,
          fileId: cs.rdFileId,
          type: isTranscode ? 'transcode' : 'direct',
        }),
      })
      const data = await res.json()
      if (!res.ok) return null

      if (isTranscode) {
        // Return the same variant we were using
        if (cs.label?.includes('LiveMP4') && data.liveMP4) return data.liveMP4
        if (cs.type === 'hls' && data.apple) return data.apple
        if (cs.type === 'dash' && data.dash) return data.dash
        return data.liveMP4 || data.apple || data.dash || null
      }
      return data.download || null
    } catch {
      return null
    }
  }, [streams, currentStreamIndex])

  // ── Critical: resolveAndRetry ────────────────────────────────────
  const resolveAndRetry = useCallback(async () => {
    setIsChangingStream(true)
    setLastFallbackError(t.errors.refreshingStream || 'Refreshing stream...')
    try {
      const params = new URLSearchParams({
        tmdbId: contentId,
        type: type === 'movie' ? 'movie' : 'episode',
        ...(season && { season: season.toString() }),
        ...(episode && { episode: episode.toString() }),
      })
      const res = await fetch(`/api/stream/resolve?${params}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.streams?.length > 0) {
        setStreams(data.streams)
        const cfg = getPlayerConfig(data.streams)
        const idx = data.streams.findIndex((s: StreamResult) => s.url === cfg.stream.url)
        setCurrentStreamIndex(idx >= 0 ? idx : 0)
        setError(null)
      } else {
        setError(t.errors.noStreams)
      }
    } catch {
      setError(t.errors.streamFailed)
    } finally {
      setIsChangingStream(false)
    }
  }, [contentId, type, season, episode, t])

  // ── Load video source ────────────────────────────────────────────
  useEffect(() => {
    const cs = streams[currentStreamIndex]
    if (!cs || !videoRef.current) return
    const video = videoRef.current
    video.volume = volume
    video.playbackRate = playbackRate

    // Destroy previous HLS instance
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }

    setIsChangingStream(true)

    const cfg = getPlayerConfig([cs])

    if (cfg.playerType === 'hls.js' && cs.url.includes('.m3u8')) {
      import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          // Fallback: let native try
          video.src = cs.url
          video.load()
          safePlay()
          return
        }
        const hls = new Hls({
          enableWorker: true,
          maxBufferLength: 15,
          maxMaxBufferLength: 30,
          maxBufferSize: 30 * 1000000,
          maxBufferHole: 0.8,
          abrEwmaDefaultEstimate: 500000,
          abrBandWidthFactor: 0.8,
          abrBandWidthUpFactor: 0.5,
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
          startLevel: -1,
        })
        hls.loadSource(cs.url)
        hls.attachMedia(video)

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          const levels = data.levels.map((l, i) => ({
            id: i,
            label: l.height ? `${l.height}p` : `Level ${i}`
          })).reverse()
          setHlsLevels(levels)
          setIsChangingStream(false)
          safePlay()
        })

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          setCurrentLevel(hls.autoLevelEnabled ? -1 : data.level)
        })

        hls.on(Hls.Events.ERROR, (_, d) => {
          if (d.fatal) {
            if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // Try refreshing the URL first
              refreshStreamUrl().then(fresh => {
                if (fresh && hlsRef.current) {
                  hlsRef.current.loadSource(fresh)
                } else {
                  setLastFallbackError(`Network error — switching server...`)
                  tryNextStream()
                }
              }).catch(() => tryNextStream())
            } else {
              setLastFallbackError(`Error: ${d.type} — switching...`)
              tryNextStream()
            }
          }
        })
        hlsRef.current = hls
      })
    } else if (cfg.playerType === 'native-hls') {
      // Native HLS (Safari iOS)
      video.src = cs.url
      video.load()
      const onCanPlay = () => {
        setIsChangingStream(false)
        safePlay()
      }
      video.addEventListener('canplay', onCanPlay, { once: true })
    } else {
      // Direct MP4 / DASH
      video.src = cs.url
      video.load()
      const onCanPlay = () => {
        setIsChangingStream(false)
        safePlay()
      }
      video.addEventListener('canplay', onCanPlay, { once: true })
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams, currentStreamIndex])

  // ── Anti-stall timer for HLS ─────────────────────────────────────
  useEffect(() => {
    if (!hlsRef.current || !videoRef.current) return
    const hls = hlsRef.current
    const video = videoRef.current
    let lastPos = 0
    let stallCount = 0

    const timer = setInterval(() => {
      if (video.paused) { stallCount = 0; return }
      if (video.currentTime === lastPos) {
        stallCount++
        if (stallCount >= 3 && hls.autoLevelEnabled) {
          const nextLevel = Math.max(0, hls.currentLevel - 1)
          hls.currentLevel = nextLevel
          stallCount = 0
        }
      } else {
        stallCount = 0
      }
      lastPos = video.currentTime
    }, 5000)

    return () => clearInterval(timer)
  }, []) // runs once on mount; refs are stable

  // ── Background URL refresh timer ─────────────────────────────────
  useEffect(() => {
    const cs = streams[currentStreamIndex]
    if (!cs?.rdFileId || !cs?.rdTorrentId) return

    const isTranscode = cs.type === 'hls' || cs.type === 'dash' || cs.label?.includes('LiveMP4')
    const intervalMs = isTranscode ? 3.5 * 60 * 60 * 1000 : 7 * 60 * 60 * 1000

    const timer = setInterval(() => {
      refreshStreamUrl().then(fresh => {
        if (!fresh || !videoRef.current) return
        const video = videoRef.current
        const current = video.currentTime

        if (hlsRef.current) {
          hlsRef.current.loadSource(fresh)
        } else {
          video.src = fresh
        }
        video.currentTime = current
      }).catch(() => {})
    }, intervalMs)

    refreshTimerRef.current = timer
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [streams, currentStreamIndex, refreshStreamUrl])

  // ── Cross-Server sync ────────────────────────────────────────────
  useEffect(() => {
    if (previousStreamIndex.current !== currentStreamIndex) {
      previousStreamIndex.current = currentStreamIndex
      hasResumed.current = false

      const cs = streams[currentStreamIndex]
      if (cs?.type === 'embed') {
        setIsChangingStream(false)
      } else {
        setIsChangingStream(true)
      }
    }
  }, [currentStreamIndex, streams])

  // ── Resume playback ──────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onReady = () => {
      if (!hasResumed.current && lastKnownTime.current > 0) {
        video.currentTime = lastKnownTime.current
        hasResumed.current = true
      }
      setIsChangingStream(false)
    }
    video.addEventListener('canplay', onReady)
    return () => video.removeEventListener('canplay', onReady)
  }, [currentStreamIndex])

  // ── Time tracking ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => {
      if (!isScrubbing) {
        setCurrentTime(video.currentTime)
        if (video.currentTime > 0) lastKnownTime.current = video.currentTime

        if (segments?.intro) {
          setShowSkipIntro(video.currentTime >= segments.intro.start_sec && video.currentTime <= segments.intro.end_sec)
        }
        if (segments?.outro) {
          setShowNextEpisodeBtn(video.currentTime >= segments.outro.start_sec)
        } else if (video.duration > 0 && video.currentTime >= video.duration - 30) {
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
    const onWaiting = () => setIsBuffering(true)
    const onPlaying = () => { setIsBuffering(false); setIsPlaying(true) }
    const onStalled = () => setIsBuffering(true)

    video.addEventListener('timeupdate', onTime)
    video.addEventListener('durationchange', onDur)
    video.addEventListener('progress', onBuf)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('stalled', onStalled)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('durationchange', onDur)
      video.removeEventListener('progress', onBuf)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('stalled', onStalled)
      video.removeEventListener('ended', onEnded)
    }
  }, [isScrubbing, syncProgress, segments])

  // ── tryNextStream: with resolveAndRetry fallback ─────────────────
  function tryNextStream() {
    if (currentStreamIndex < streams.length - 1) {
      setCurrentStreamIndex(i => i + 1)
    } else {
      // Exhausted all variants — try resolving fresh streams
      resolveAndRetry()
    }
  }

  // ── Controls visibility ──────────────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false)
    }, 3000)
  }, [])

  // ── Touch gestures ───────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStartX(touch.clientX)
    setTouchStartY(touch.clientY)
    setTouchStartTime(Date.now())
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY
    const dt = Date.now() - touchStartTime
    const width = window.innerWidth
    const height = window.innerHeight
    const x = touch.clientX
    const y = touch.clientY

    // Multi-tap detector
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300) {
      const now = Date.now()
      const timeSince = now - lastTapTime.current
      if (timeSince < 400) {
        tapCount.current += 1
      } else {
        tapCount.current = 1
      }
      lastTapTime.current = now

      // Double tap in left 30%: seek backward 10s
      if (tapCount.current === 2 && x < width * 0.3) {
        if (videoRef.current) videoRef.current.currentTime -= 10
        tapCount.current = 0
        return
      }
      // Double tap in right 30%: seek forward 10s
      if (tapCount.current === 2 && x > width * 0.7) {
        if (videoRef.current) videoRef.current.currentTime += 10
        tapCount.current = 0
        return
      }
      // Double tap in center: toggle fullscreen
      if (tapCount.current === 2) {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          containerRef.current?.requestFullscreen()
        }
        tapCount.current = 0
        return
      }
      // Single tap: show controls + toggle play/pause if in center
      showControls()
      if (x > width * 0.3 && x < width * 0.7 && y > height * 0.3 && y < height * 0.7) {
        safeToggle()
      }
      return
    }

    // Horizontal swipe: seek
    if (Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx)) {
      if (dx > 50 && videoRef.current) videoRef.current.currentTime -= 10
      if (dx < -50 && videoRef.current) videoRef.current.currentTime += 10
      return
    }

    // Vertical swipe: volume (right side) or brightness (left side) - volume only for now
    if (Math.abs(dy) > 30 && Math.abs(dx) < Math.abs(dy)) {
      const video = videoRef.current
      if (!video) return
      if (x > width * 0.5) {
        video.volume = Math.min(1, Math.max(0, video.volume + (dy < 0 ? 0.1 : -0.1)))
        setVolume(video.volume)
      }
      return
    }
  }

  // ── Keyboard ─────────────────────────────────────────────────────
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
          if (document.fullscreenElement) { document.exitFullscreen() } else { containerRef.current?.requestFullscreen() }
          break
        case 'KeyM': video.muted = !video.muted; break
        case 'KeyJ': adjustSubtitleOffset(-250); break
        case 'KeyK': adjustSubtitleOffset(250); break
      }
      showControls()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showControls, setVolume, safeToggle, adjustSubtitleOffset])

  useEffect(() => {
    const cb = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', cb)
    return () => document.removeEventListener('fullscreenchange', cb)
  }, [])

  // ── Progress bar ─────────────────────────────────────────────────
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect()
    if (!rect || !videoRef.current) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    videoRef.current.currentTime = pct * duration
    setCurrentTime(pct * duration)
  }

  const handleProgressMouseDown = () => setIsScrubbing(true)
  const handleProgressMouseUp = () => setIsScrubbing(false)

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect()
    if (!rect || !videoRef.current) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))

    if (isScrubbing) {
      videoRef.current.currentTime = pct * duration
      setCurrentTime(pct * duration)
    }

    handleProgressHover(e)
  }

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect()
    if (!rect) return
    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current)
    hoverRafRef.current = requestAnimationFrame(() => {
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const time = pct * duration
      const x = e.clientX - rect.left
      if (hoverTooltipRef.current) {
        hoverTooltipRef.current.style.display = 'block'
        hoverTooltipRef.current.style.left = `${x}px`
        hoverTooltipRef.current.textContent = formatTime(time)
      }
      if (hoverIndicatorRef.current) {
        hoverIndicatorRef.current.style.left = `${x}px`
      }
    })
  }

  const handleProgressLeave = () => {
    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current)
    if (hoverTooltipRef.current) hoverTooltipRef.current.style.display = 'none'
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0
  const cs = streams[currentStreamIndex]

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={`relative bg-black flex-1 flex flex-col select-none w-full h-full overflow-hidden`}
      onMouseMove={showControls}
      onTouchStart={(e) => { handleTouchStart(e); showControls() }}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: controlsVisible ? 'default' : 'none' }}
    >
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="text-center flex flex-col items-center gap-5">
            <Image src="/logo.png" alt="مشهد" width={96} height={96} className="w-24 h-24 animate-pulse" />
            <div className="w-32 h-[2px] bg-white/10 rounded-full overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-[#E50914] to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
            </div>
            <p className="text-[#666] text-sm">{t.player.searchingStreams}</p>
          </div>
        </div>
      )}

      {/* Stream-switching spinner */}
      {isChangingStream && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 pointer-events-none">
          <div className="text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-[#E50914] animate-spin" />
            {lastFallbackError && <p className="text-xs text-[#666] animate-pulse">{lastFallbackError}</p>}
          </div>
        </div>
      )}

      {/* Buffering spinner */}
      {isBuffering && !isChangingStream && isPlaying && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 pointer-events-none">
           <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-[#E50914] animate-spin shadow-2xl" />
        </div>
      )}

      {/* ASS Subtitle Warning */}
      <AnimatePresence>
        {showAssWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-yellow-600/90 text-black text-xs px-4 py-2 rounded-xl backdrop-blur-md"
          >
            {lang === 'ar'
              ? 'قد لا تُعرض الترجمة بتنسيق ASS (الأنمي) بشكل صحيح'
              : 'ASS subtitles (anime) may not render correctly'}
            <button onClick={() => setShowAssWarning(false)} className="ml-2 font-bold">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="text-center max-w-md px-6">
            <div className="text-5xl mb-4">😔</div>
            <h2 className="text-xl font-bold mb-2">{t.player.failedToLoad}</h2>
            <p className="text-[#B3B3B3] mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => resolveAndRetry()} className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors">
                {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
              <button onClick={() => router.back()} className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors">{t.player.goBack}</button>
            </div>
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
        />
      ) : (
        <video ref={videoRef} className="w-full h-full object-contain bg-black" onError={tryNextStream} playsInline controls={false} preload="metadata">
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
          autoPlayNext={true}
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
              <button onClick={() => router.back()} className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="flex-1" />
              {/* Subtitle selector */}
              {cs?.type !== 'embed' && (
                <div className="flex items-center gap-2">
                  {/* HLS Quality Selector */}
                  {hlsLevels.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => { setShowLevelMenu(s => !s); setSubtitleMenuOpen(false); setServerMenuOpen(false) }}
                        className="px-3 py-2 rounded-full backdrop-blur-md bg-white/10 text-white text-xs hover:bg-white/20 transition-all flex items-center gap-1.5"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20M2 12l5-5m0 10l-5-5m20 0l-5-5m0 10l5-5"/></svg>
                        {currentLevel === -1 ? 'Auto' : hlsLevels.find(l => l.id === currentLevel)?.label || 'Auto'}
                      </button>
                      <AnimatePresence>
                        {showLevelMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            className="absolute right-0 top-12 w-32 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-50 border border-white/10"
                          >
                            <button
                              onClick={() => { if (hlsRef.current) hlsRef.current.currentLevel = -1; setShowLevelMenu(false) }}
                              className={`w-full text-left px-4 py-2.5 text-xs transition-all ${currentLevel === -1 ? 'bg-[#E50914]/20 text-white' : 'text-[#B3B3B3] hover:bg-white/5 hover:text-white'}`}
                            >
                              Auto
                            </button>
                            {hlsLevels.map(level => (
                              <button
                                key={level.id}
                                onClick={() => { if (hlsRef.current) hlsRef.current.currentLevel = level.id; setShowLevelMenu(false) }}
                                className={`w-full text-left px-4 py-2.5 text-xs transition-all ${currentLevel === level.id ? 'bg-[#E50914]/20 text-white' : 'text-[#B3B3B3] hover:bg-white/5 hover:text-white'}`}
                              >
                                {level.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => { setSubtitleMenuOpen(s => !s); setServerMenuOpen(false); setShowLevelMenu(false) }}
                      className={`px-4 py-2 rounded-full backdrop-blur-md text-sm hover:bg-white/20 transition-all flex items-center gap-2 ${activeSub ? 'bg-[#E50914]/30 text-white' : 'bg-white/10 text-white'}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 12h4m-2 3h6"/></svg>
                      {activeSub ? (activeSub.language === 'ar' ? 'العربية' : activeSub.language === 'en' ? 'English' : activeSub.language) : t.player.noSubtitles}
                    </button>
                    <AnimatePresence>
                      {subtitleMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          className="absolute right-0 top-12 w-72 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-50 border border-white/10 max-h-80 overflow-y-auto"
                        >
                          <div className="px-4 py-2 text-xs text-[#666] uppercase tracking-wider border-b border-white/10">{t.player.subtitles || 'Subtitles'}</div>
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
                              key={`${s.fileId}-${s.language}`}
                              onClick={() => { loadSubtitle(s); setSubtitleMenuOpen(false) }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-all ${activeSub?.fileId === s.fileId ? 'bg-[#E50914]/20 text-white' : 'text-[#B3B3B3] hover:bg-white/5 hover:text-white'}`}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 min-w-0">
                                  {activeSub?.fileId === s.fileId && <span className="w-2 h-2 rounded-full bg-[#E50914] flex-shrink-0" />}
                                  <span className="truncate">{s.uploaderName}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 ${s.language === 'ar' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {s.language === 'ar' ? 'AR' : 'EN'}
                                  </span>
                                  {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E50914]/30 text-[#E50914] flex-shrink-0">{t.player.bestMatch}</span>}
                                </span>
                                <span className="text-[10px] text-[#555] flex-shrink-0">
                                  {s.syncScore != null && s.syncScore > 0 ? `⚡${s.syncScore}` : `⬇${s.downloadCount}`}
                                </span>
                              </span>
                              {s.fileName && <p className="text-[10px] text-[#444] truncate mt-0.5 ml-4">{s.fileName.replace(/\.[^.]+$/, '').substring(0, 50)}</p>}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
                      <div className="px-4 py-2 text-xs text-[#666] uppercase tracking-wider border-b border-white/10">{t.player.availableStreams}</div>
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
                  <div
                    ref={hoverTooltipRef}
                    className="absolute bottom-8 px-2 py-1 bg-black/90 rounded text-xs text-white pointer-events-none transform -translate-x-1/2 z-10"
                    style={{ display: 'none' }}
                  />
                  <div
                    ref={progressBarRef}
                    className="relative w-full h-1 group-hover:h-2 bg-white/20 rounded-full cursor-pointer transition-all duration-200"
                    onClick={handleProgressClick}
                    // safari needs touch-action: none for reliable touch scrubbing
                    style={{ touchAction: 'none' }}
                    onMouseDown={handleProgressMouseDown}
                    onMouseUp={handleProgressMouseUp}
                    onMouseMove={handleProgressMouseMove}
                    onMouseLeave={handleProgressLeave}
                    onTouchStart={(e) => {
                      const rect = progressBarRef.current?.getBoundingClientRect()
                      if (!rect || !videoRef.current) return
                      const pct = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width))
                      videoRef.current.currentTime = pct * duration
                      setCurrentTime(pct * duration)
                      setIsScrubbing(true)
                    }}
                    onTouchMove={(e) => {
                      if (!isScrubbing) return
                      const rect = progressBarRef.current?.getBoundingClientRect()
                      if (!rect || !videoRef.current) return
                      const pct = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width))
                      videoRef.current.currentTime = pct * duration
                      setCurrentTime(pct * duration)
                    }}
                    onTouchEnd={() => setIsScrubbing(false)}
                  >
                    <div className="absolute top-0 left-0 h-full bg-white/30 rounded-full pointer-events-none" style={{ width: `${bufPct}%` }} />
                    <div className="absolute top-0 left-0 h-full bg-[#E50914] rounded-full pointer-events-none" style={{ width: `${pct}%` }} />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 group-hover:w-4 group-hover:h-4 bg-[#E50914] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
                      style={{ left: `calc(${pct}% - 6px)` }}
                    />
                  </div>
                </div>

                {/* Time + buttons */}
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button onClick={safeToggle} className="w-11 h-11 flex items-center justify-center text-white hover:text-[#E50914] transition-colors" aria-label="Play/Pause">
                    {isPlaying ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
                    )}
                  </button>

                  {/* Seek back */}
                  <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10 }} className="w-11 h-11 flex items-center justify-center text-white hover:text-[#E50914] transition-colors" title="Rewind 10s" aria-label="Rewind">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.5 8L8 12l4.5 4"/><path d="M20 12a8 8 0 1 0-3 6.3"/><text x="12" y="16" fill="currentColor" fontSize="6" textAnchor="middle" stroke="none">10</text></svg>
                  </button>

                  {/* Seek forward */}
                  <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10 }} className="w-11 h-11 flex items-center justify-center text-white hover:text-[#E50914] transition-colors" title="Forward 10s" aria-label="Forward">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11.5 8L16 12l-4.5 4"/><path d="M4 12a8 8 0 1 0 3 6.3"/><text x="12" y="16" fill="currentColor" fontSize="6" textAnchor="middle" stroke="none">10</text></svg>
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-1 group/vol">
                    <button onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted }} className="w-11 h-11 flex items-center justify-center text-white hover:text-[#E50914] transition-colors" aria-label="Mute">
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
                    className="w-11 h-11 flex items-center justify-center text-white hover:text-[#E50914] transition-colors"
                    aria-label="Fullscreen"
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
