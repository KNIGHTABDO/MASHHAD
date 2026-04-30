import Link from 'next/link'
import { getServerT } from '@/lib/i18n/server'

export default async function MainNotFound() {
  const { lang } = await getServerT()

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white px-6">
      <div className="text-center">
        <h1 className="text-6xl font-black text-[#E50914] mb-4">404</h1>
        <p className="text-xl text-[#B3B3B3] mb-8">
          {lang === 'ar' ? 'المحتوى غير موجود' : 'Content not found'}
        </p>
        <Link
          href="/"
          className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors"
        >
          {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </Link>
      </div>
    </div>
  )
}
