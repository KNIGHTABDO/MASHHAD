'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useProfileStore } from '@/store/profileStore'
import { useT } from '@/lib/i18n/context'
import type { Profile } from '@/types/profile'
import { containerVariants, itemVariants } from '@/lib/animations'


export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [manageMode, setManageMode] = useState(false)
  const { setActiveProfile } = useProfileStore()
  const router = useRouter()
  const { t } = useT()

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setProfiles(data || [])
    setLoading(false)
  }

  function selectProfile(profile: Profile) {
    if (manageMode) return
    setActiveProfile(profile)
    document.cookie = `active_profile_id=${profile.id}; path=/; max-age=604800; samesite=lax`
    // Use hard navigation so the middleware receives the freshly-set cookie
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#666] text-lg">{t.content.loading}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Background */}
      <div className="fixed inset-0 bg-[#0A0A0A]" />
      <div className="fixed inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 30% 40%, #E50914 0%, transparent 50%)',
      }} />

      <div className="relative z-10 w-full max-w-2xl">
        <h1 className="text-3xl font-black text-center mb-12">{t.profiles.title}</h1>

        {/* Profile Grid */}
        <AnimatePresence>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap justify-center gap-6 mb-12"
          >
            {profiles.map(profile => (
              <motion.div key={profile.id} variants={itemVariants}>
                <ProfileCard
                  profile={profile}
                  onSelect={() => selectProfile(profile)}
                  manageMode={manageMode}
                  onEdit={() => router.push(`/profiles/manage?edit=${profile.id}`)}
                />
              </motion.div>
            ))}

            {/* Add Profile */}
            {profiles.length < 5 && (
              <motion.div variants={itemVariants}>
                <button
                  onClick={() => router.push('/profiles/manage')}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#333] flex items-center justify-center text-4xl text-[#444] group-hover:border-white group-hover:text-white transition-all duration-300 group-hover:scale-105">
                    +
                  </div>
                  <span className="text-[#B3B3B3] text-sm group-hover:text-white transition-colors">
                    {t.profiles.addProfile}
                  </span>
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Manage button */}
        <div className="flex justify-center">
          <button
            onClick={() => setManageMode(m => !m)}
            className={`px-8 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              manageMode
                ? 'bg-white text-black border-white'
                : 'border-[#B3B3B3] text-[#B3B3B3] hover:border-white hover:text-white'
            }`}
          >
            {manageMode ? t.profiles.done : t.profiles.manageProfiles}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ profile, onSelect, manageMode, onEdit }: {
  profile: Profile
  onSelect: () => void
  manageMode: boolean
  onEdit: () => void
}) {
  const initial = profile.name[0] || '؟'

  return (
    <div className="flex flex-col items-center gap-3 group">
      <div className="relative">
        <motion.button
          onClick={manageMode ? onEdit : onSelect}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          className="relative w-24 h-24 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden"
          style={{ backgroundColor: profile.avatar_color || '#E50914' }}
        >
          {initial}
          {/* Kids badge */}
          {profile.is_kids && (
            <span className="absolute top-1 right-1 text-sm">⭐</span>
          )}
          {/* Edit overlay */}
          {manageMode && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg">
              ✏️
            </div>
          )}
        </motion.button>

        {/* Hover ring */}
        <div className="absolute -inset-1 rounded-2xl border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
      <span className="text-[#B3B3B3] text-sm group-hover:text-white transition-colors font-medium">
        {profile.name}
      </span>
    </div>
  )
}
