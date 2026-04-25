'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types/profile'

interface ProfileStore {
  activeProfile: Profile | null
  setActiveProfile: (profile: Profile | null) => void
  clearProfile: () => void
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      activeProfile: null,
      setActiveProfile: (profile) => set({ activeProfile: profile }),
      clearProfile: () => set({ activeProfile: null }),
    }),
    {
      name: 'mashhad-profile',
    }
  )
)
