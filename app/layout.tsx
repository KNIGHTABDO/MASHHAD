import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from '@/components/Providers'

const thmanyah = localFont({
  src: [
    { path: '../public/fonts/thmanyahsans-Light.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/thmanyahsans-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/thmanyahsans-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/thmanyahsans-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../public/fonts/thmanyahsans-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-thmanyah',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'مشهد — منصة المحتوى العربي',
  description: 'شاهد أحدث الأفلام والمسلسلات العربية والعالمية بجودة عالية على مشهد.',
  keywords: ['أفلام', 'مسلسلات', 'عربي', 'بث مباشر', 'مشهد'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className={thmanyah.variable}>
      <body className="bg-[#0A0A0A] text-white antialiased font-[family-name:var(--font-thmanyah)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
