'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useProfileStore } from '@/store/profileStore'
import { useT } from '@/lib/i18n/context'

export function Navbar() {
  const { t, lang, setLang } = useT()
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { activeProfile, clearProfile } = useProfileStore()
  const searchRef = useRef<HTMLInputElement>(null)

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/movies', label: t.nav.movies },
    { href: '/series', label: t.nav.series },
    { href: '/search', label: t.nav.search },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearProfile()
    router.push('/login')
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const avatarColor = activeProfile?.avatar_color || '#E50914'
  const avatarInitial = activeProfile?.name?.[0] || '؟'

  return (
    <motion.header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass border-b border-[var(--border-subtle)]' : 'bg-gradient-to-b from-black/60 to-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image src="/logo.png" alt="مشهد" width={80} height={80} className="h-9 w-auto" priority />
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === link.href
                    ? 'text-white bg-white/10'
                    : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all flex items-center gap-1.5"
              title={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>

            {/* Search */}
            <AnimatePresence mode="wait">
              {searchOpen ? (
                <motion.form
                  key="search-open"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 260, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSearch}
                  className="flex items-center gap-2 overflow-hidden"
                >
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t.search.placeholder}
                    className="w-full bg-[#1F1F1F] border border-[var(--border-visible)] rounded-xl px-4 py-2 text-sm text-white placeholder-[#666] outline-none focus:border-[#0071E3] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="text-[#666] hover:text-white transition-colors flex-shrink-0 text-xl"
                  >
                    ✕
                  </button>
                </motion.form>
              ) : (
                <motion.button
                  key="search-icon"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSearchOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-[#B3B3B3] hover:text-white hover:bg-white/10 transition-all"
                  aria-label={t.nav.search}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Profile Avatar */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(p => !p)}
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-white transition-all hover:scale-105"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarInitial}
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-12 w-52 glass rounded-xl shadow-2xl overflow-hidden z-50`}
                    onMouseLeave={() => setProfileMenuOpen(false)}
                  >
                    {activeProfile && (
                      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                        <p className="text-sm font-medium">{activeProfile.name}</p>
                        <p className="text-xs text-[#666] mt-0.5">{t.profiles.manageProfiles}</p>
                      </div>
                    )}
                    <Link
                      href="/profiles"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[#B3B3B3] hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span>👤</span> {t.profiles.title}
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[#B3B3B3] hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span>⚙️</span> {t.settings.title}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#E50914] hover:bg-white/5 transition-colors border-t border-[var(--border-subtle)]"
                    >
                      <span>🚪</span> {t.auth.logout}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
