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
    { href: '/anime', label: t.nav.anime },
    { href: '/my-list', label: t.nav.watchlist },
    { href: '/history', label: t.nav.history },
  ]
  
  if (activeProfile?.role === 'admin') {
    navLinks.push({ href: '/admin', label: t.nav.admin })
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchOpen) {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
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
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 ease-in-out ${
        scrolled 
          ? 'bg-black/80 backdrop-blur-xl border-b border-white/10 py-0' 
          : 'bg-gradient-to-b from-black/90 via-black/40 to-transparent py-2'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center flex-shrink-0 transition-transform active:scale-95">
              <Image src="/logo.png" alt="مشهد" width={200} height={200} className="h-14 w-auto" priority />
            </Link>

            {/* Nav Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium transition-all duration-300 group ${
                    pathname === link.href ? 'text-white' : 'text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  {link.label}
                  {pathname === link.href && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute bottom-0 inset-x-4 h-0.5 bg-[#E50914] rounded-full"
                    />
                  )}
                  <div className="absolute bottom-0 inset-x-4 h-0.5 bg-white/20 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search */}
            <div className="flex items-center">
              <AnimatePresence mode="wait">
                {searchOpen ? (
                  <motion.form
                    key="search-open"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 300, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onSubmit={handleSearch}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-[#666]">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={t.search.placeholder}
                      className="flex-1 bg-transparent border-none text-sm text-white placeholder-[#666] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="text-[#666] hover:text-white transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </motion.form>
                ) : (
                  <motion.button
                    key="search-icon"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={() => setSearchOpen(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-white hover:bg-white/10 transition-all group"
                    aria-label={t.nav.search}
                  >
                    <div className="relative">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="group-hover:scale-110 transition-transform">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                      <span className="hidden sm:block absolute -top-1 -right-1 text-[8px] bg-white/10 border border-white/20 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">/</span>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Language Selector */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center overflow-hidden border border-white/10 group"
              title={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
            >
              <span className="text-[10px] font-bold group-hover:scale-110 transition-transform">
                {lang === 'ar' ? 'EN' : 'AR'}
              </span>
            </button>

            {/* Profile Avatar */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(p => !p)}
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white transition-all hover:scale-105 active:scale-95 border border-white/20 shadow-lg"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarInitial}
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(10px)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-14 w-60 bg-[#141414]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 border border-white/10 p-1.5`}
                  >
                    {activeProfile && (
                      <div className="px-3 py-3 mb-1 border-b border-white/5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: avatarColor }}>
                          {avatarInitial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{activeProfile.name}</p>
                          <p className="text-[10px] text-[#666] font-medium">{t.profiles.manageProfiles}</p>
                        </div>
                      </div>
                    )}
                    <Link
                      href="/profiles"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#B3B3B3] hover:text-white hover:bg-white/5 rounded-lg transition-all group"
                    >
                      <span className="group-hover:scale-125 transition-transform">👤</span> 
                      <span className="font-medium">{t.profiles.title}</span>
                    </Link>
                    <Link
                      href="/my-list"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#B3B3B3] hover:text-white hover:bg-white/5 rounded-lg transition-all group"
                    >
                      <span className="group-hover:scale-125 transition-transform">🔖</span>
                      <span className="font-medium">{t.nav.watchlist}</span>
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#B3B3B3] hover:text-white hover:bg-white/5 rounded-lg transition-all group"
                    >
                      <span className="group-hover:scale-125 transition-transform">⌛</span>
                      <span className="font-medium">{t.nav.history}</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#B3B3B3] hover:text-white hover:bg-white/5 rounded-lg transition-all group"
                    >
                      <span className="group-hover:scale-125 transition-transform">⚙️</span>
                      <span className="font-medium">{t.settings.title}</span>
                    </Link>
                    <div className="h-px bg-white/5 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#E50914] hover:bg-[#E50914]/10 rounded-lg transition-all group"
                    >
                      <span className="group-hover:scale-125 transition-transform">🚪</span>
                      <span className="font-bold">{t.auth.logout}</span>
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
