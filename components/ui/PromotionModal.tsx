"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '@/lib/i18n/context'
import { useUser } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'

export function PromotionModal() {
  const { lang } = useT()
  const { user } = useUser()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const isPro = user?.publicMetadata?.plan === 'lifetime' || user?.publicMetadata?.isPro === true

  useEffect(() => {
    // 1. Don't show if already Pro
    if (isPro) return
    
    // 2. Don't show on the upgrade page itself
    if (pathname === '/upgrade') return

    // 3. Check permanent dismissal
    const hasDismissedPermanent = localStorage.getItem('mashhad_pro_dismissed')
    if (hasDismissedPermanent) return

    // 4. Check 3-hour cooldown
    const lastShown = localStorage.getItem('mashhad_pro_last_shown')
    const threeHours = 3 * 60 * 60 * 1000
    
    if (!lastShown || (Date.now() - parseInt(lastShown)) > threeHours) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        // Update the last shown timestamp
        localStorage.setItem('mashhad_pro_last_shown', Date.now().toString())
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isPro, pathname])

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('mashhad_pro_dismissed', 'true')
    }
    setIsOpen(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative max-w-lg w-full bg-linear-to-b from-[#1a1a1a] to-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E50914]/10 blur-[100px] -translate-y-1/2 translate-x-1/2" />
            
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-[#666] hover:text-white transition-colors"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            <div className="relative z-10 text-center">
              <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black mb-6 border border-amber-500/20 tracking-widest">
                {lang === 'ar' ? 'عرض حصري' : 'EXCLUSIVE OFFER'}
              </div>

              <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">
                {lang === 'ar' ? 'حرر اشتراكك بالكامل' : 'Unlock Everything Forever'}
              </h2>

              <p className="text-[#B3B3B3] mb-8 leading-relaxed">
                {lang === 'ar' 
                  ? 'استمتع بمشاهدة غير محدودة للأبد مقابل 5$ فقط لمرة واحدة. لا حدود، لا إعلانات، لا تعقيد.' 
                  : 'Upgrade to Mashhad Pro for a one-time payment of $5. Get unlimited watch time, priority servers, and lifetime access.'}
              </p>

              <div className="bg-white/5 rounded-2xl p-6 mb-8 flex items-center justify-between border border-white/5">
                <div className="text-left">
                  <p className="text-[10px] text-[#666] font-bold uppercase tracking-widest mb-1">
                    {lang === 'ar' ? 'سعر مدى الحياة' : 'LIFETIME PRICE'}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">$5</span>
                    <span className="text-sm text-[#666] line-through">$29</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
                  ✨
                </div>
              </div>

              <button 
                onClick={() => {
                  handleClose()
                  window.location.href = '/upgrade'
                }}
                className="w-full py-4 bg-[#E50914] hover:bg-[#f40a16] text-white font-bold rounded-2xl transition-all shadow-xl shadow-[#E50914]/20 active:scale-[0.98] mb-6"
              >
                {lang === 'ar' ? 'احصل على العرض الآن' : 'Claim Lifetime Pro Now'}
              </button>

              <div className="flex items-center justify-center gap-2">
                <input 
                  type="checkbox" 
                  id="dont-show" 
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 accent-[#E50914]"
                />
                <label htmlFor="dont-show" className="text-xs text-[#666] hover:text-[#B3B3B3] cursor-pointer transition-colors">
                  {lang === 'ar' ? 'لا تظهر هذا مجدداً' : "Don't show this again"}
                </label>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
