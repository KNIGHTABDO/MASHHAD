'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useT } from '@/lib/i18n/context'

export function Footer() {
  const { lang } = useT()
  const isAr = lang === 'ar'

  const legalLinks = [
    { href: '/privacy', label: isAr ? 'سياسة الخصوصية' : 'Privacy Policy' },
    { href: '/terms', label: isAr ? 'شروط الاستخدام' : 'Terms of Service' },
    { href: '/contact', label: isAr ? 'تواصل معنا' : 'Contact Us' },
  ]

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[#0A0A0A]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center">
            <Image src="/logo.png" alt="مشهد" width={80} height={80} className="h-8 w-auto" />
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 flex-wrap justify-center">
            {legalLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-[#666] hover:text-[#B3B3B3] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-[#444]">
            © {new Date().getFullYear()} {isAr ? 'مشهد. جميع الحقوق محفوظة.' : 'Mashhad. All rights reserved.'}
          </p>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-[#333] text-center mt-6 max-w-2xl mx-auto leading-relaxed">
          {isAr
            ? 'مشهد هي منصة تجميع وواجهة فقط. لا تستضيف المنصة أي محتوى وسائط. جميع الأفلام والمسلسلات والبيانات الوصفية مقدمة عبر واجهات برمجة تطبيقات خارجية وهي مملوكة لأصحابها.'
            : 'Mashhad is an aggregation platform and interface only. It does not host any media content. All movies, series, and metadata are provided through third-party APIs and are owned by their respective rights holders.'}
        </p>
      </div>
    </footer>
  )
}
