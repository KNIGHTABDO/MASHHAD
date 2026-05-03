'use client'

import { useEffect, useState } from 'react'
import { useClerk, useUser } from '@clerk/nextjs'
import { useT } from '@/lib/i18n/context'
import { motion } from 'framer-motion'
import { slideUp } from '@/lib/animations'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const { t, lang } = useT()
  const { user, isLoaded } = useUser()
  const { openUserProfile } = useClerk()

  useEffect(() => {
    if (!isLoaded) return
    setEmail(user?.emailAddresses[0]?.emailAddress || '')
  }, [isLoaded, user])

  async function handleChangePassword() {
    if (!user) return
    openUserProfile()
  }

  return (
    <div className="min-h-screen pt-8 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div {...slideUp}>
          <h1 className="text-3xl font-black mb-2">{t.settings.title}</h1>
          <div className="w-12 h-1 bg-[#E50914] rounded-full mb-10" />

          {/* Account section */}
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-6">{t.settings.account}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#B3B3B3] mb-2">{t.auth.email}</label>
                <div className="bg-[#1F1F1F] border rounded-xl px-4 py-3 text-[#666]" style={{ borderColor: 'var(--border-subtle)' }} dir="ltr">
                  {email || t.content.loading}
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                className="w-full border text-[#B3B3B3] hover:text-white hover:border-white py-3 rounded-xl transition-all text-sm"
                style={{ borderColor: 'var(--border-visible)' }}
              >
                {t.settings.changePassword}
              </button>
            </div>
          </div>

          {/* Profiles section */}
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">{t.settings.profiles}</h2>
            <a
              href="/profiles/manage"
              className="flex items-center justify-between p-4 bg-[#1F1F1F] rounded-xl hover:bg-[#2A2A2A] transition-colors"
            >
              <span className="text-sm">{t.profiles.manageProfiles}</span>
              <span className="text-[#666]">←</span>
            </a>
          </div>

          {/* Admin section */}
          {user?.emailAddresses[0]?.emailAddress === 'knight007youtu@gmail.com' && (
            <div className="glass rounded-2xl p-6 mb-6 border border-amber-500/30">
              <h2 className="text-lg font-bold text-amber-500 mb-4">Admin Controls</h2>
              <button 
                onClick={async () => {
                  const res = await fetch('/api/admin/force-pro', { method: 'POST' });
                  const data = await res.json();
                  if (data.success) {
                    alert('Pro Status Activated! Please refresh the page.');
                    window.location.reload();
                  } else {
                    alert('Error: ' + data.error);
                  }
                }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black py-3 rounded-xl transition-all text-sm"
              >
                Force Activate Pro Status
              </button>
            </div>
          )}

          {/* Danger zone */}
          <div className="glass rounded-2xl p-6 border border-[rgba(229,9,20,0.2)]">
            <h2 className="text-lg font-bold text-[#E50914] mb-4">{lang === 'ar' ? 'منطقة الخطر' : 'Danger Zone'}</h2>
            <button className="w-full border border-[#E50914]/50 text-[#E50914] hover:bg-[rgba(229,9,20,0.1)] py-3 rounded-xl transition-all text-sm">
              {t.settings.deleteAccount}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
