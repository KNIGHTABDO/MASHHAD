'use client'

import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useT } from '@/lib/i18n/context'
import { getTMDBImageUrl, formatYear, formatRating } from '@/lib/utils/format'

// ─── Types ───────────────────────────────────────────────────────────────────
interface PosterData {
  id: number
  title: string
  year: string
  rating: string
  image: string
  cls?: string // Fallback gradient
}

const FALLBACK_POSTERS: PosterData[] = [
  { id: 1, title: 'الفجر', year: '2024', rating: '8.7', image: '', cls: 'from-orange-900 via-red-900 to-red-950' },
  { id: 2, title: 'ليالي بيروت', year: '2023', rating: '8.2', image: '', cls: 'from-purple-900 via-violet-900 to-indigo-950' },
  { id: 3, title: 'Horizon', year: '2024', rating: '9.1', image: '', cls: 'from-slate-800 via-slate-900 to-blue-950' },
  { id: 4, title: 'سمر', year: '2024', rating: '7.9', image: '', cls: 'from-rose-900 via-rose-900 to-pink-950' },
  { id: 5, title: 'Abyss', year: '2023', rating: '8.4', image: '', cls: 'from-teal-900 via-teal-900 to-cyan-950' },
  { id: 6, title: 'مسافر', year: '2024', rating: '8.6', image: '', cls: 'from-amber-900 via-orange-900 to-yellow-950' },
]

const PROFILE_COLORS = ['#E50914', '#0071E3', '#2ECC71', '#9B59B6', '#F5A623']
const PROFILE_NAMES = ['أحمد', 'سارة', 'محمد', 'نور', 'أطفال']

// ─── Counter ─────────────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const divRef = useRef<HTMLDivElement>(null)
  const fired = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !fired.current) {
        fired.current = true
        const start = Date.now()
        const dur = 2000
        const tick = () => {
          const p = Math.min((Date.now() - start) / dur, 1)
          setCount(Math.floor((1 - Math.pow(1 - p, 3)) * to))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    if (divRef.current) observer.observe(divRef.current)
    return () => observer.disconnect()
  }, [to])

  return <div ref={divRef}>{to >= 1000 ? count.toLocaleString() : count}{suffix}</div>
}

// ─── 3D Tilt Card ────────────────────────────────────────────────────────────
function TiltCard({ title, year, cls, rating, image }: PosterData) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), { stiffness: 300, damping: 30 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 300, damping: 30 })

  return (
    <motion.div
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - r.left) / r.width - 0.5)
        my.set((e.clientY - r.top) / r.height - 0.5)
      }}
      onMouseLeave={() => { mx.set(0); my.set(0) }}
      whileHover={{ scale: 1.06, zIndex: 10 }}
      className={`relative w-full aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-gradient-to-br ${cls || 'from-gray-800 to-gray-900'} shadow-2xl will-change-transform`}
    >
      {image && (
        <Image 
          src={image} 
          alt={title} 
          fill 
          sizes="(max-width: 768px) 33vw, 20vw"
          className="object-cover" 
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/10 pointer-events-none" />
      <div className="absolute top-2 end-2 bg-[#E50914] text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg backdrop-blur-sm bg-opacity-90">★ {rating}</div>
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/40 to-transparent">
        <p className="text-white font-bold text-[10px] md:text-xs leading-tight line-clamp-1">{title}</p>
        <p className="text-white/50 text-[10px] mt-0.5">{year}</p>
      </div>
    </motion.div>
  )
}

// ─── Feature Section ─────────────────────────────────────────────────────────
function FeatureSection({
  bg, tag, title, desc, children, flip = false,
}: {
  bg: string; tag: string; title: string; desc: string; children?: React.ReactNode; flip?: boolean
}) {
  return (
    <section className="relative py-16 md:py-28 overflow-hidden">
      <div className="absolute inset-0">
        <Image src={bg} alt="" fill className="object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-transparent to-[#0A0A0A]" />
        <div className={`absolute inset-0 bg-gradient-to-${flip ? 'r' : 'l'} from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent`} />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          viewport={{ once: true }}
          className={flip ? 'md:order-2' : ''}
        >
          <span className="text-[#E50914] text-xs font-bold uppercase tracking-[0.2em] mb-3 block">{tag}</span>
          <h2 className="text-2xl md:text-5xl font-black mb-4 leading-tight">{title}</h2>
          <p className="text-[#B3B3B3] text-base md:text-lg leading-relaxed">{desc}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          viewport={{ once: true }}
          className={flip ? 'md:order-1' : ''}
        >
          {children}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Hero Section (Scroll Scrubbing) ─────────────────────────────────────────
function HeroSection({ t }: { t: ReturnType<typeof useT>['t'] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Framer Motion for text fade
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] })
  const textOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 0.18], [0, -60])
  const scrollOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0])

  const getScrollProgress = () => {
    const container = containerRef.current
    if (!container) return 0
    const { top } = container.getBoundingClientRect()
    const totalScroll = container.offsetHeight - window.innerHeight
    return Math.max(0, Math.min(1, -top / totalScroll))
  }

  // Scroll → video.currentTime (direct DOM, no React state)
  useEffect(() => {
    const syncVideo = () => {
      const video = videoRef.current
      if (!video || !video.duration || isNaN(video.duration)) return
      // 0.3 offset skips Veo's black fade-in leader frames
      const MIN_TIME = 0.3
      video.currentTime = MIN_TIME + getScrollProgress() * (video.duration - MIN_TIME)
    }
    window.addEventListener('scroll', syncVideo, { passive: true })
    return () => window.removeEventListener('scroll', syncVideo)
  }, [])

  // After metadata loads: play → pause forces the browser to decode & paint frame 1
  const handleLoaded = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      await video.play()
      video.pause()
      // Seek to first real frame (skip black leader)
      video.currentTime = 0.3
    } catch {
      video.currentTime = 0.3
    }
  }

  return (
    <div ref={containerRef} style={{ height: '280vh', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Video fills sticky container; extra height hides Veo watermark at bottom */}
        <video
          ref={videoRef}
          src="/landing/hero-scroll-opt.mp4"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={handleLoaded}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 'calc(100% + 4rem)',
            objectFit: 'cover',
          }}
        />
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none" />
        {/* Hero text */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h1
              className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-4 md:mb-6 leading-tight px-2"
              style={{
                background: 'linear-gradient(to bottom, #ffffff 40%, rgba(255,255,255,0.45))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t.landing.feature1Title === 'Endless Content' ? 'Your Gateway to Cinema' : 'بوابتك للسينما'}
            </h1>
            <p className="text-sm sm:text-lg md:text-2xl text-[#B3B3B3] max-w-2xl mx-auto leading-relaxed mb-7 md:mb-10 px-2">
              {t.landing.feature1Desc}
            </p>
            <Link
              href="/register"
              className="inline-block px-7 py-3 md:px-10 md:py-4 bg-[#E50914] text-white text-base md:text-lg font-black rounded-full hover:bg-[#b20710] transition-all transform hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 0 40px rgba(229,9,20,0.5)' }}
            >
              {t.landing.heroCta}
            </Link>
          </motion.div>
        </motion.div>
        {/* Scroll indicator */}
        <motion.div
          style={{ opacity: scrollOpacity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs uppercase tracking-[0.25em] text-[#E50914] font-bold">{t.landing.heroScroll}</span>
          <motion.div
            className="w-px h-12 bg-gradient-to-b from-[#E50914] to-transparent"
            animate={{ scaleY: [1, 0.5, 1], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </div>
  )
}

// ─── Subtitle Demo UI ─────────────────────────────────────────────────────────
function SubtitleDemo() {
  const lines = [
    { src: 'SubDL', score: 95, text: 'أنا لم أختر هذه الحياة...' },
    { src: 'OpenSubtitles', score: 88, text: 'I never chose this life...' },
    { src: 'Stremio', score: 72, text: 'ما هذا الذي أراه؟' },
  ]
  return (
    <div className="glass rounded-2xl p-6 border border-white/10 space-y-3">
      <p className="text-xs text-[#666] uppercase tracking-widest mb-4 font-bold">Auto-sync engine</p>
      {lines.map((l, i) => (
        <motion.div key={l.src}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15, duration: 0.5 }}
          viewport={{ once: true }}
          className={`flex items-center justify-between p-3 rounded-xl ${i === 0 ? 'bg-[#E50914]/15 border border-[#E50914]/30' : 'bg-white/5'}`}
        >
          <div>
            <p className="text-xs font-bold text-[#B3B3B3]">{l.src}</p>
            <p className={`text-sm mt-0.5 ${i === 0 ? 'text-white font-medium' : 'text-[#666]'}`}>{l.text}</p>
          </div>
          <div className={`text-xs font-black px-2 py-1 rounded-md ${i === 0 ? 'bg-[#E50914] text-white' : 'bg-white/10 text-[#B3B3B3]'}`}>
            {l.score}%
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Speed Demo UI ───────────────────────────────────────────────────────────
function SpeedDemo() {
  const [started, setStarted] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true) }, { threshold: 0.5 })
    if (barRef.current) observer.observe(barRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={barRef} className="glass rounded-2xl p-6 border border-white/10 space-y-5">
      <p className="text-xs text-[#666] uppercase tracking-widest font-bold">Real-Debrid stream</p>
      {[
        { label: 'Resolution', value: '4K UHD', pct: 100 },
        { label: 'Bitrate', value: '80 Mbps', pct: 90 },
        { label: 'Buffer', value: '0%', pct: 5 },
      ].map(({ label, value, pct }) => (
        <div key={label}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#B3B3B3] font-medium">{label}</span>
            <span className="text-white font-bold">{value}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#E50914] to-[#ff4444] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: started ? `${pct}%` : '0%' }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Profile Demo UI ─────────────────────────────────────────────────────────
function ProfileDemo() {
  const [active, setActive] = useState(0)
  return (
    <div className="glass rounded-2xl p-8 border border-white/10 text-center">
      <p className="text-xs text-[#666] uppercase tracking-widest font-bold mb-6">من يشاهد؟</p>
      <div className="flex justify-center gap-4 flex-wrap">
        {PROFILE_COLORS.map((color, i) => (
          <motion.button
            key={i}
            onClick={() => setActive(i)}
            whileHover={{ scale: 1.1, y: -4 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 cursor-pointer"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-black transition-all"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}66)`,
                boxShadow: active === i ? `0 0 20px ${color}80` : 'none',
                border: active === i ? `2px solid ${color}` : '2px solid transparent',
              }}
            >
              {PROFILE_NAMES[i][0]}
            </div>
            <span className={`text-xs font-medium ${active === i ? 'text-white' : 'text-[#666]'}`}>{PROFILE_NAMES[i]}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { t, lang, dir } = useT()
  const [posters, setPosters] = useState<PosterData[]>(FALLBACK_POSTERS)

  useEffect(() => {
    async function fetchPosters() {
      try {
        const res = await fetch(`/api/tmdb/trending/movie/week?lang=${lang}`)
        if (!res.ok) return
        const data = await res.json()
        const trending = data.results.slice(0, 6).map((m: any) => ({
          id: m.id,
          title: m.title || m.name,
          year: formatYear(m.release_date || m.first_air_date),
          rating: formatRating(m.vote_average),
          image: getTMDBImageUrl(m.poster_path, 'w500'),
        }))
        if (trending.length > 0) {
          setPosters(trending)
        }
      } catch (err) {
        console.error('Failed to fetch trending posters:', err)
      }
    }
    fetchPosters()
  }, [lang])

  return (
    <div className="bg-[#0A0A0A] text-white" dir={dir}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-12 py-3 md:py-5"
        style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.9) 0%,transparent 100%)', backdropFilter: 'blur(6px)' }}>
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="مشهد" width={32} height={32} className="w-7 h-7 md:w-9 md:h-9" />
          <span className="text-lg md:text-xl font-black tracking-tight">مشهد</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-xs md:text-sm font-medium text-[#B3B3B3] hover:text-white transition-colors px-2 md:px-3 py-1">
            {t.auth.login}
          </Link>
          <Link href="/register"
            className="px-3 py-1.5 md:px-5 md:py-2 bg-[#E50914] text-white text-xs md:text-sm font-bold rounded-full hover:bg-[#b20710] transition-all hover:scale-105 active:scale-95"
            style={{ boxShadow: '0 0 18px rgba(229,9,20,0.4)' }}>
            {t.landing.heroCta}
          </Link>
        </div>
      </nav>

      {/* ── Hero — must NOT be inside any overflow wrapper ─────────────────── */}
      <HeroSection t={t} />

      {/* ── Everything below the hero — overflow-x clip safe ──────────────── */}
      <div style={{ overflowX: 'clip' }}>


      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-black/70 backdrop-blur-xl border-y border-white/5">
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
          {[
            { n: 50000, suffix: '+', label: t.landing.statsContent },
            { n: 3, suffix: '', label: t.landing.statsSubtitles },
            { n: 5, suffix: '', label: t.landing.statsProfiles },
            { n: 4, suffix: 'K', label: t.landing.statsSpeed },
          ].map(({ n, suffix, label }) => (
            <div key={label}>
              <div className="text-3xl md:text-5xl font-black text-[#E50914] mb-1.5 md:mb-2">
                <Counter to={n} suffix={suffix} />
              </div>
              <p className="text-[#B3B3B3] text-xs md:text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature 1: Content ────────────────────────────────────────────── */}
      <section className="py-14 md:py-24 px-5 md:px-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}
          >
            <span className="text-[#E50914] text-xs font-bold uppercase tracking-widest mb-3 block">{t.landing.feature1Tag}</span>
            <h2 className="text-2xl md:text-5xl font-black mb-4 leading-tight">{t.landing.feature1Title}</h2>
            <p className="text-[#B3B3B3] text-base md:text-lg leading-relaxed mb-6 md:mb-8">{t.landing.feature1Desc}</p>
            <ul className="space-y-3">
              {[t.landing.f1b1, t.landing.f1b2, t.landing.f1b3].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="w-5 h-5 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-3 h-3 text-[#E50914]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }} viewport={{ once: true }}
            className="grid grid-cols-3 gap-2 md:gap-3" style={{ perspective: '800px' }}
          >
            {posters.map(p => <TiltCard key={p.id} {...p} />)}
          </motion.div>
        </div>
      </section>

      {/* ── Feature 2: Subtitles ──────────────────────────────────────────── */}
      <FeatureSection
        bg="/landing/feature-subtitles-bg.png"
        tag={t.landing.feature2Tag}
        title={t.landing.feature2Title}
        desc={t.landing.feature2Desc}
      >
        <SubtitleDemo />
      </FeatureSection>

      {/* ── Feature 3: Speed ──────────────────────────────────────────────── */}
      <FeatureSection
        bg="/landing/feature-speed-bg.png"
        tag={t.landing.feature3Tag}
        title={t.landing.feature3Title}
        desc={t.landing.feature3Desc}
        flip
      >
        <SpeedDemo />
      </FeatureSection>

      {/* ── Feature 4: Profiles ───────────────────────────────────────────── */}
      <FeatureSection
        bg="/landing/feature-profiles-bg.png"
        tag={t.landing.feature4Tag}
        title={t.landing.feature4Title}
        desc={t.landing.feature4Desc}
      >
        <ProfileDemo />
      </FeatureSection>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-40 flex flex-col items-center justify-center text-center px-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#1a0000] to-[#0A0A0A]" />
        <div className="absolute inset-0 opacity-40"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(229,9,20,0.45) 0%, transparent 70%)' }} />
        <motion.div
          initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }} viewport={{ once: true }}
          className="relative z-10 max-w-3xl w-full"
        >
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black mb-4 md:mb-6 leading-tight">{t.landing.ctaTitle}</h2>
          <p className="text-base md:text-xl text-[#B3B3B3] mb-8 md:mb-12 leading-relaxed">{t.landing.ctaDesc}</p>
          <Link href="/register"
            className="inline-block px-8 py-4 md:px-14 md:py-5 bg-[#E50914] text-white text-base md:text-xl font-black rounded-full hover:bg-[#b20710] transition-all hover:scale-110 active:scale-95"
            style={{ boxShadow: '0 0 70px rgba(229,9,20,0.6), 0 0 140px rgba(229,9,20,0.3)' }}
          >
            {t.landing.ctaButton}
          </Link>
          <p className="mt-5 text-[#555] text-xs md:text-sm">{t.landing.ctaSub}</p>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-5 md:px-16 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-5 mb-5 md:flex-row md:justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="مشهد" width={28} height={28} className="w-7 h-7" />
              <span className="font-bold text-[#B3B3B3]">مشهد</span>
            </div>
            <div className="flex flex-wrap justify-center gap-5 md:gap-8 text-xs md:text-sm text-[#666]">
              <Link href="/privacy" className="hover:text-white transition-colors">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
              <Link href="/terms" className="hover:text-white transition-colors">{lang === 'ar' ? 'شروط الاستخدام' : 'Terms'}</Link>
              <Link href="/contact" className="hover:text-white transition-colors">{lang === 'ar' ? 'تواصل معنا' : 'Contact'}</Link>
            </div>
            <p className="text-xs text-[#444]">© {new Date().getFullYear()} مشهد. {t.landing.footerRights}</p>
          </div>
          <p className="text-xs text-[#333] text-center max-w-2xl mx-auto">{t.landing.footerDisclaimer}</p>
        </div>
      </footer>

      </div>{/* end overflow-x clip wrapper */}
    </div>
  )
}
