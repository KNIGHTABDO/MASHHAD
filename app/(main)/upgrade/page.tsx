"use client"

import { motion } from 'framer-motion'
import { useT } from '@/lib/i18n/context'
import { useUser } from '@clerk/nextjs'

const STRIPE_LINK = "https://buy.stripe.com/test_4gMeVd1S00x8cOKc9OeAg00"

export default function UpgradePage() {
  const { lang } = useT()
  const { user } = useUser()

  const handleUpgrade = () => {
    if (!user) return
    // We pass the Clerk User ID as client_reference_id so Stripe tells us who paid
    const checkoutUrl = `${STRIPE_LINK}?client_reference_id=${user.id}`
    window.location.href = checkoutUrl
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      
      <main className="pt-32 pb-20 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 rounded-full bg-[#E50914]/10 text-[#E50914] text-sm font-bold mb-6 border border-[#E50914]/20"
          >
            {lang === 'ar' ? 'عرض خاص لفترة محدودة' : 'LIMITED TIME OFFER'}
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black mb-6 tracking-tight"
          >
            {lang === 'ar' ? 'مشاهدة بلا حدود. للأبد.' : 'Watch Unlimited. Forever.'}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[#B3B3B3] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12"
          >
            {lang === 'ar' 
              ? 'تخلص من قيود الـ 5 ساعات اليومية. ادفع 5$ مرة واحدة فقط واستمتع بكافة مميزات مشهد برو مدى الحياة.' 
              : "Say goodbye to the 5-hour daily limit. Pay just $5 once and unlock Mashhad Pro features for a lifetime."}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#141414] border border-white/5 rounded-3xl p-8 flex flex-col"
          >
            <h3 className="text-xl font-bold mb-2">{lang === 'ar' ? 'الخطة المجانية' : 'Free Plan'}</h3>
            <div className="text-3xl font-black mb-8">$0</div>
            
            <ul className="space-y-4 mb-12 flex-1">
              <li className="flex items-center gap-3 text-[#B3B3B3]">
                <span className="text-red-500 font-bold">✕</span>
                {lang === 'ar' ? 'حد مشاهدة 5 ساعات يومياً' : '5-hour daily watch limit'}
              </li>
              <li className="flex items-center gap-3 text-[#B3B3B3]">
                <span className="text-green-500 font-bold">✓</span>
                {lang === 'ar' ? 'وصول لجميع الأفلام والمسلسلات' : 'Access to all movies & series'}
              </li>
            </ul>
            
            <button disabled className="w-full py-4 rounded-xl bg-white/5 text-[#666] font-bold cursor-not-allowed">
              {lang === 'ar' ? 'خطتك الحالية' : 'Your Current Plan'}
            </button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-linear-to-b from-[#1a1a1a] to-[#141414] border border-[#E50914]/30 rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-2xl shadow-[#E50914]/10"
          >
            <div className="absolute top-0 right-0 bg-[#E50914] text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
              {lang === 'ar' ? 'مدى الحياة' : 'LIFETIME'}
            </div>

            <h3 className="text-xl font-bold mb-2">{lang === 'ar' ? 'مشهد برو' : 'Mashhad Pro'}</h3>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl font-black">$5</span>
              <span className="text-[#B3B3B3] line-through text-lg">$29</span>
            </div>
            
            <ul className="space-y-4 mb-12 flex-1">
              <li className="flex items-center gap-3">
                <span className="text-[#E50914] font-bold text-xl">✓</span>
                <span className="font-bold">{lang === 'ar' ? 'مشاهدة غير محدودة 24/7' : 'Unlimited streaming 24/7'}</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-[#E50914] font-bold text-xl">✓</span>
                {lang === 'ar' ? 'أولوية في جودة السيرفرات' : 'Priority server quality'}
              </li>
              <li className="flex items-center gap-3 text-[#E50914] text-sm font-medium">
                ✨ {lang === 'ar' ? 'دفع لمرة واحدة فقط' : 'Only one payment ever'}
              </li>
            </ul>
            
            <button 
              onClick={handleUpgrade}
              className="w-full py-4 rounded-xl bg-[#E50914] hover:bg-[#f40a16] text-white font-bold transition-all shadow-lg shadow-[#E50914]/20 active:scale-95"
            >
              {lang === 'ar' ? 'اشترك الآن بـ 5$' : 'Upgrade Now for $5'}
            </button>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="text-3xl mb-4">♾️</div>
            <h4 className="font-bold mb-2">{lang === 'ar' ? 'لا حدود' : 'No Limits'}</h4>
            <p className="text-sm text-[#B3B3B3]">{lang === 'ar' ? 'شاهد كل ما تريد دون التفكير في الوقت المتبقي.' : 'Watch everything you want without worrying about time limits.'}</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-4">🚀</div>
            <h4 className="font-bold mb-2">{lang === 'ar' ? 'سرعة قصوى' : 'Maximum Speed'}</h4>
            <p className="text-sm text-[#B3B3B3]">{lang === 'ar' ? 'وصول أسرع للسيرفرات وجودة 4K فائقة.' : 'Faster access to servers and ultra 4K quality.'}</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-4">❤️</div>
            <h4 className="font-bold mb-2">{lang === 'ar' ? 'دعم المنصة' : 'Support Mashhad'}</h4>
            <p className="text-sm text-[#B3B3B3]">{lang === 'ar' ? 'مساهمتك تساعدنا على الاستمرار وتطوير ميزات جديدة.' : 'Your contribution helps us keep the platform alive and develop new features.'}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
