'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html dir="rtl" lang="ar">
      <body className="bg-[#0A0A0A] text-white min-h-screen flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="text-2xl font-bold mb-4">حدث خطأ خطير</h2>
          <p className="text-[#B3B3B3] mb-6 text-sm">حدث خطأ غير متوقع في التطبيق.</p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-[#E50914] text-white font-bold rounded-xl hover:bg-[#B20710] transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  )
}
