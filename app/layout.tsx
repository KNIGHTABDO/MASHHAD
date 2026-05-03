import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from '@/components/Providers'

const clerkAppearance = {
  theme: 'simple',
  cssLayerName: 'clerk',
  variables: {
    colorPrimary: '#E50914',
    colorForeground: '#FFFFFF',
    colorMutedForeground: '#B3B3B3',
    colorBackground: '#141414',
    colorInput: '#1F1F1F',
    colorInputForeground: '#FFFFFF',
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorPrimaryForeground: '#FFFFFF',
  },
  options: {
    logoPlacement: 'outside',
  },
}

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A0A0A',
}

export const metadata: Metadata = {
  title: 'مشهد — منصة المحتوى العربي',
  description: 'شاهد أحدث الأفلام والمسلسلات العربية والعالمية بجودة عالية على مشهد.',
  keywords: ['أفلام', 'مسلسلات', 'عربي', 'بث مباشر', 'مشهد'],
  referrer: 'origin',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'مشهد — منصة المحتوى العربي',
    description: 'شاهد أحدث الأفلام والمسلسلات العربية والعالمية بجودة عالية على مشهد.',
    siteName: 'مشهد',
    type: 'website',
    locale: 'ar_SA',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className={thmanyah.variable}>
      <head>
        <link rel="preconnect" href="https://api.themoviedb.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.real-debrid.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://vidsrc.me" />
        <link rel="dns-prefetch" href="https://api.opensubtitles.com" />
        <link rel="dns-prefetch" href="https://api.subdl.com" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-[#0A0A0A] text-white antialiased font-(family-name:--font-thmanyah)">
        <ClerkProvider appearance={clerkAppearance}>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
