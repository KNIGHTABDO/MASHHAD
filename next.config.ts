import type { NextConfig } from 'next'

const securityHeaders = [
  // Prevents clickjacking — SAMEORIGIN allows VidSrc iframe within our own page
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevents MIME-type sniffing attacks
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Controls what the browser sends as Referer header
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restricts access to browser features we don't use
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Enable DNS prefetch for performance
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Content Security Policy — allow embeds from streaming providers
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://image.tmdb.org https://*.gravatar.com data:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.themoviedb.org https://api.real-debrid.com https://*.supabase.co https://api.opensubtitles.com https://api.subdl.com https://*.strem.io",
      "frame-src 'self' https://vidsrc.me https://vidbom.com https://*.vidbom.com https://*.dood.la https://*.dood.stream https://streamwish.com https://*.streamwish.com https://filemoon.sx https://*.filemoon.sx https://*.fasselhd.com",
      "media-src 'self' blob: https:",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: '**.gravatar.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'mashhad-web.vercel.app'],
    },
  },
}

export default nextConfig
