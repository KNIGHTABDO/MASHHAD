'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/context'

export default function MainError({ error, reset }: { error: Error; reset: () => void }) {
  const { lang } = useT()

  useEffect(() => {
    console.error('[Main Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white px-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-4">
          {lang === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'}
        </h2>
        <p className="text-[#B3B3B3] mb-6 text-sm">
          {error.message || (lang === 'ar' ? 'حدث خطأ أثناء تحميل هذه الصفحة.' : 'An error occurred while loading this page.')}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors"
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-white/10 font-bold rounded-xl hover:bg-white/20 transition-colors"
          >
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
