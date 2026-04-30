'use client'

import { useEffect } from 'react'
import { useT } from '@/lib/i18n/context'

export default function WatchError({ error, reset }: { error: Error; reset: () => void }) {
  const { lang } = useT()

  useEffect(() => {
    console.error('[Watch Error]', error)
  }, [error])

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center text-white px-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">😔</div>
        <h2 className="text-2xl font-bold mb-4">
          {lang === 'ar' ? 'فشل تحميل المشغّل' : 'Player failed to load'}
        </h2>
        <p className="text-[#B3B3B3] mb-6 text-sm">{error.message}</p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors"
        >
          {lang === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
        </button>
      </div>
    </div>
  )
}
