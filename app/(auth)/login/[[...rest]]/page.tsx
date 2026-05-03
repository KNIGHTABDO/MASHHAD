'use client'

import { motion } from 'framer-motion'
import { SignIn } from '@clerk/nextjs'
import { useT } from '@/lib/i18n/context'
import { slideUp } from '@/lib/animations'

const clerkAppearance = {
  theme: 'simple',
  variables: {
    colorBackground: '#141414',
    colorPrimary: '#E50914',
    colorForeground: '#FFFFFF',
    colorMutedForeground: '#B3B3B3',
    colorInput: '#1F1F1F',
    colorInputForeground: '#FFFFFF',
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorPrimaryForeground: '#FFFFFF',
  },
  options: {
    logoPlacement: 'outside',
  },
  elements: {
    card: 'bg-transparent shadow-none border-0 p-0',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton: 'hidden',
    socialButtonsIconButton: 'hidden',
    dividerLine: 'hidden',
    dividerText: 'hidden',
    formFieldLabel: 'text-[#B3B3B3] text-sm',
    formFieldInput:
      'bg-[#1F1F1F] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#666] focus:border-[#E50914] focus:ring-0',
    formButtonPrimary:
      'bg-[#E50914] hover:bg-[#C4070F] text-white shadow-[0_16px_35px_rgba(229,9,20,0.28)] transition-all',
    footerActionText: 'text-[#666]',
    footerActionLink: 'text-[#E50914] hover:text-[#ff4d4d]',
  },
}

export default function LoginPage() {
  const { t } = useT()
  const highlights = [t.nav.movies, t.nav.series, t.nav.anime, t.nav.watchlist, t.nav.history, t.profiles.title]

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8 md:py-12">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(to bottom right, #0A0A0A, #141414, #0A0A0A)' }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, #E50914 0%, transparent 50%), radial-gradient(circle at 80% 20%, #0071E3 0%, transparent 40%)',
        }}
      />

      <div className="relative z-10 w-full max-w-6xl grid gap-6 lg:grid-cols-[1.05fr_0.95fr] items-stretch">
        <motion.aside
          {...slideUp}
          className="hidden lg:flex flex-col justify-between rounded-4xl border border-white/10 bg-white/3 backdrop-blur-xl p-10 overflow-hidden relative"
        >
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(229,9,20,0.18), transparent 38%), radial-gradient(circle at bottom right, rgba(0,113,227,0.14), transparent 35%)' }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/25 px-4 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E50914]" />
              <span className="text-xs font-semibold tracking-[0.35em] text-[#B3B3B3] uppercase">Mashhad</span>
            </div>

            <div className="mt-10 max-w-lg">
              <h1 className="text-5xl font-black tracking-tight text-white leading-tight">{t.auth.login}</h1>
              <div className="mt-5 flex flex-wrap gap-2">
                {highlights.map(item => (
                  <span key={item} className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-[#D7D7D7]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3 text-sm text-[#B3B3B3]">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-white font-semibold">{t.profiles.title}</div>
              <div className="mt-1">{t.nav.history}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-white font-semibold">{t.nav.watchlist}</div>
              <div className="mt-1">{t.content.continueWatching}</div>
            </div>
          </div>
        </motion.aside>

        <motion.section {...slideUp} className="w-full max-w-xl mx-auto lg:mx-0 lg:justify-self-end">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-black text-white tracking-tight">مشهد</h1>
            <div className="w-12 h-1 bg-[#E50914] mx-auto mt-2 rounded-full" />
          </div>

          <div className="glass rounded-4xl p-4 sm:p-6 md:p-8 shadow-2xl overflow-hidden border border-white/10 bg-black/45 backdrop-blur-2xl">
            <SignIn
              appearance={clerkAppearance}
              routing="path"
              path="/login"
              signUpUrl="/register"
              fallbackRedirectUrl="/profiles"
              signUpFallbackRedirectUrl="/profiles"
            />
          </div>
        </motion.section>
      </div>
    </div>
  )
}