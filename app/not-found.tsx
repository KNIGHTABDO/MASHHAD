import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#E50914] mb-4">404</h1>
        <p className="text-xl text-[#B3B3B3] mb-6">الصفحة غير موجودة</p>
        <Link href="/" className="px-6 py-3 bg-[#E50914] text-white font-bold rounded-xl hover:bg-[#b5070f] transition-colors">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  )
}
