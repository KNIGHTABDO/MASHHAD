"use client"

import { motion } from 'framer-motion'
import { useT } from '@/lib/i18n/context'
import { SignInButton } from '@clerk/nextjs'

interface UpgradeOverlayProps {
  isLimitReached: boolean
}

export function UpgradeOverlay({ isLimitReached }: UpgradeOverlayProps) {
  const { t, lang } = useT()

  if (!isLimitReached) return null

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 text-center"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full bg-[#141414] border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <div className="w-16 h-16 bg-[#E50914] rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto shadow-lg shadow-[#E50914]/20">
          🎬
        </div>

        <h2 className="text-2xl font-black mb-3">
          {lang === 'ar' ? 'انتهى وقت المشاهدة اليومي' : 'Daily Limit Reached'}
        </h2>
        
        <p className="text-[#B3B3B3] mb-8 leading-relaxed">
          {lang === 'ar' 
            ? 'لقد استهلكت 5 ساعات من المشاهدة المجانية اليوم. احصل على اشتراك مدى الحياة لمرة واحدة فقط واستمتع بمشاهدة غير محدودة للأبد!' 
            : "You've reached your 5-hour free limit for today. Get lifetime access for a one-time payment and watch unlimited forever!"}
        </p>

        <div className="space-y-4">
          <button 
            onClick={() => window.location.href = '/upgrade'}
            className="w-full py-4 bg-[#E50914] hover:bg-[#f40a16] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#E50914]/20 active:scale-95"
          >
            {lang === 'ar' ? 'تفعيل الوصول مدى الحياة - 5$' : 'Unlock Lifetime Access - $5'}
          </button>
          
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-3 text-[#B3B3B3] hover:text-white transition-colors text-sm font-medium"
          >
            {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-[#666]">
          <span>✨</span>
          <span>{lang === 'ar' ? 'دفع لمرة واحدة، مشاهدة للأبد' : 'One-time payment, watch forever'}</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
