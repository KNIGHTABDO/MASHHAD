'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StreamResult } from '@/types/stream'
import type { Subtitle } from '@/types/subtitle'

interface PlayerStore {
  contentId: string
  currentServer: string
  availableServers: StreamResult[]
  currentSubtitle: Subtitle | null
  subtitleOffset: number
  isPlaying: boolean
  volume: number
  playbackRate: number
  quality: string
  setContentId: (id: string) => void
  setCurrentServer: (server: string) => void
  setAvailableServers: (servers: StreamResult[]) => void
  setCurrentSubtitle: (subtitle: Subtitle | null) => void
  setSubtitleOffset: (offset: number) => void
  setIsPlaying: (playing: boolean) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  setQuality: (quality: string) => void
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      contentId: '',
      currentServer: '',
      availableServers: [],
      currentSubtitle: null,
      subtitleOffset: 0,
      isPlaying: false,
      volume: 1,
      playbackRate: 1,
      quality: 'auto',
      setContentId: (contentId) => set({ contentId }),
      setCurrentServer: (currentServer) => set({ currentServer }),
      setAvailableServers: (availableServers) => set({ availableServers }),
      setCurrentSubtitle: (currentSubtitle) => set({ currentSubtitle }),
      setSubtitleOffset: (subtitleOffset) => set({ subtitleOffset }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setVolume: (volume) => set({ volume }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      setQuality: (quality) => set({ quality }),
    }),
    {
      name: 'mashhad-player',
      partialize: (state) => ({
        volume: state.volume,
        playbackRate: state.playbackRate,
        quality: state.quality,
        subtitleOffset: state.subtitleOffset,
      }),
    }
  )
)
