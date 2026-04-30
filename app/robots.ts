import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/movies', '/series', '/anime', '/search', '/landing', '/privacy', '/terms', '/contact', '/login', '/register'],
      disallow: ['/api/', '/watch/', '/admin/', '/profiles/', '/settings/'],
    },
    sitemap: 'https://mashhad-web.vercel.app/sitemap.xml',
  }
}
