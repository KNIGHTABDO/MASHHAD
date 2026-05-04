import type { NextConfig } from "next";

const securityHeaders = [
  // Prevents clickjacking — SAMEORIGIN allows VidSrc iframe within our own page
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevents MIME-type sniffing attacks
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Controls what the browser sends as Referer header
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restricts access to browser features we don't use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Enable DNS prefetch for performance
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Content Security Policy — allow embeds from streaming providers
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://image.tmdb.org https://img.youtube.com https://*.ytimg.com https://s4.anilist.co https://*.gravatar.com https://img.clerk.com https://challenges.cloudflare.com https://*.egydead.live data:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.themoviedb.org https://api.real-debrid.com https://*.real-debrid.com https://*.stream.real-debrid.com https://*.real-debrid.cloud https://*.download.real-debrid.cloud https://*.supabase.co https://api.opensubtitles.com https://api.subdl.com https://*.strem.io https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://*.streamruby.net",
      "worker-src 'self' blob:",
      "frame-src 'self' https://www.youtube.com https://*.youtube.com https://playimdb.com https://*.playimdb.com https://streamimdb.ru https://*.streamimdb.ru https://vidsrc.me https://vidbom.com https://*.vidbom.com https://*.dood.la https://*.dood.stream https://streamwish.com https://*.streamwish.com https://filemoon.sx https://*.filemoon.sx https://*.fasselhd.com https://*.egydead.live https://challenges.cloudflare.com",
      "media-src 'self' blob: https:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "**.gravatar.com",
      },
      {
        protocol: "https",
        hostname: "s4.anilist.co",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "**.egydead.live",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "mashhad-web.vercel.app"],
    },
  },
};

export default nextConfig;
