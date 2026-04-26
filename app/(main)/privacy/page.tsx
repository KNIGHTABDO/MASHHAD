'use client'

import { useT } from '@/lib/i18n/context'

export default function PrivacyPolicyPage() {
  const { lang } = useT()
  const isAr = lang === 'ar'

  return (
    <div className={`min-h-screen py-16 px-4 sm:px-6 lg:px-8 ${isAr ? 'text-right' : 'text-left'}`}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black text-white mb-3">
          {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </h1>
        <p className="text-sm text-[#555] mb-10 border-b border-[var(--border-subtle)] pb-6">
          {isAr ? 'آخر تحديث: ٢٦ أبريل ٢٠٢٦' : 'Last Updated: April 26, 2026'}
        </p>

        <div className="space-y-10 text-[#B3B3B3] text-sm leading-7">

          {/* Intro */}
          <section>
            <p>
              {isAr
                ? 'مشهد ("المنصة"، "نحن"، "لنا") تحترم خصوصيتك وتلتزم بحماية بياناتك الشخصية. توضح هذه السياسة ما نجمعه، وكيف نستخدمه، وحقوقك كاملةً.'
                : 'Mashhad ("Platform", "we", "us") respects your privacy and is committed to protecting your personal data. This policy explains what we collect, how we use it, and your full rights.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '١. ما الذي نجمعه' : '1. What We Collect'}
            </h2>
            <ul className={`list-disc ${isAr ? 'pr-5' : 'pl-5'} space-y-2`}>
              <li>{isAr ? 'عنوان البريد الإلكتروني وكلمة المرور المُشفَّرة عند إنشاء الحساب' : 'Email address and encrypted password when you register'}</li>
              <li>{isAr ? 'أسماء الملفات الشخصية وإعداداتها (اللون، وضع الأطفال، تفضيل اللغة)' : 'Profile names and settings (avatar color, kids mode, language preference)'}</li>
              <li>{isAr ? 'سجل المشاهدة ونقاط التقدم لكل محتوى' : 'Watch history and per-content progress timestamps'}</li>
              <li>{isAr ? 'القائمة الشخصية (المحتوى المحفوظ)' : 'Watchlist (saved content)'}</li>
              <li>{isAr ? 'تفضيل اللغة المحفوظ في ملف تعريف الارتباط والتخزين المحلي' : 'Language preference stored in a cookie and localStorage'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٢. ما لا نجمعه أبداً' : '2. What We Never Collect'}
            </h2>
            <ul className={`list-disc ${isAr ? 'pr-5' : 'pl-5'} space-y-2`}>
              <li>{isAr ? 'لا نجمع أي معلومات دفع أو بطاقات ائتمانية — المنصة مجانية تماماً' : 'No payment or credit card information — the platform is completely free'}</li>
              <li>{isAr ? 'لا نستخدم ملفات تعريف ارتباط للتتبع أو الإعلانات' : 'No tracking or advertising cookies of any kind'}</li>
              <li>{isAr ? 'لا نجمع بيانات الموقع الجغرافي' : 'No geolocation data'}</li>
              <li>{isAr ? 'لا نبيع أو نؤجر أو نشارك بياناتك مع أي طرف ثالث لأغراض تجارية' : 'We do not sell, rent, or share your data with any third party for commercial purposes'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٣. ملفات تعريف الارتباط الأساسية' : '3. Essential Cookies Only'}
            </h2>
            <p className="mb-3">
              {isAr
                ? 'نستخدم ثلاثة ملفات تعريف ارتباط فقط، وجميعها ضرورية لعمل المنصة:'
                : 'We use exactly three cookies, all strictly necessary for the platform to function:'}
            </p>
            <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)]">
              <table className="w-full text-xs">
                <thead className="bg-[#141414]">
                  <tr>
                    <th className={`${isAr ? 'text-right pr-4' : 'text-left pl-4'} py-3 text-white font-semibold`}>{isAr ? 'الاسم' : 'Name'}</th>
                    <th className={`${isAr ? 'text-right' : 'text-left'} py-3 text-white font-semibold`}>{isAr ? 'الغرض' : 'Purpose'}</th>
                    <th className={`${isAr ? 'text-right' : 'text-left'} py-3 ${isAr ? 'pl-4' : 'pr-4'} text-white font-semibold`}>{isAr ? 'المدة' : 'Duration'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  <tr className="bg-[#0F0F0F]">
                    <td className={`${isAr ? 'pr-4' : 'pl-4'} py-3 font-mono text-[#E50914]`}>mashhad-lang</td>
                    <td className="py-3">{isAr ? 'تفضيل اللغة (عربي/إنجليزي)' : 'Language preference (ar/en)'}</td>
                    <td className={`py-3 ${isAr ? 'pl-4' : 'pr-4'}`}>{isAr ? 'سنة' : '1 year'}</td>
                  </tr>
                  <tr className="bg-[#0F0F0F]">
                    <td className={`${isAr ? 'pr-4' : 'pl-4'} py-3 font-mono text-[#E50914]`}>active_profile_id</td>
                    <td className="py-3">{isAr ? 'الملف الشخصي النشط حالياً' : 'Currently active profile'}</td>
                    <td className={`py-3 ${isAr ? 'pl-4' : 'pr-4'}`}>{isAr ? 'الجلسة' : 'Session'}</td>
                  </tr>
                  <tr className="bg-[#0F0F0F]">
                    <td className={`${isAr ? 'pr-4' : 'pl-4'} py-3 font-mono text-[#E50914]`}>sb-* (Supabase)</td>
                    <td className="py-3">{isAr ? 'جلسة تسجيل الدخول الآمنة' : 'Secure authentication session'}</td>
                    <td className={`py-3 ${isAr ? 'pl-4' : 'pr-4'}`}>{isAr ? 'الجلسة' : 'Session'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٤. الأمان وتخزين البيانات' : '4. Security & Data Storage'}
            </h2>
            <p>
              {isAr
                ? 'تُخزَّن جميع البيانات على خوادم Supabase (PostgreSQL) مع تفعيل أمان مستوى الصفوف (RLS) على كل الجداول، مما يعني أن كل مستخدم لا يمكنه الوصول إلا إلى بياناته الخاصة على مستوى قاعدة البيانات. كلمات المرور مُشفَّرة بواسطة bcrypt ولا يمكن الاطلاع عليها بأي شكل.'
                : 'All data is stored on Supabase (PostgreSQL) servers with Row-Level Security (RLS) enabled on every table — meaning each user can only access their own data at the database level. Passwords are bcrypt-hashed and are never accessible in any form.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٥. خدمات الطرف الثالث (واجهات API)' : '5. Third-Party Services (APIs)'}
            </h2>
            <p className="mb-3">
              {isAr
                ? 'تتصل المنصة بخدمات خارجية لجلب البيانات الوصفية والترجمات. هذه الاتصالات تتم من الخادم فقط — لا يتم إرسال بياناتك الشخصية إلى هذه الخدمات:'
                : 'The platform connects to external services to fetch metadata and subtitles. These connections are server-side only — your personal data is never sent to these services:'}
            </p>
            <ul className={`list-disc ${isAr ? 'pr-5' : 'pl-5'} space-y-1`}>
              <li><span className="text-white font-medium">TMDB</span> — {isAr ? 'بيانات الأفلام والمسلسلات' : 'Movie and series metadata'}</li>
              <li><span className="text-white font-medium">OpenSubtitles</span> — {isAr ? 'بحث وتحميل الترجمات' : 'Subtitle search and download'}</li>
              <li><span className="text-white font-medium">SubDL</span> — {isAr ? 'ترجمات عربية' : 'Arabic subtitles'}</li>
              <li><span className="text-white font-medium">Real-Debrid</span> — {isAr ? 'تسريع التنزيل (من الخادم فقط)' : 'Download acceleration (server-side only)'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٦. حقوقك الكاملة' : '6. Your Full Rights'}
            </h2>
            <ul className={`list-disc ${isAr ? 'pr-5' : 'pl-5'} space-y-2`}>
              <li><span className="text-white font-medium">{isAr ? 'الوصول' : 'Access'}</span> — {isAr ? 'يمكنك تصفح جميع بياناتك من صفحة الإعدادات' : 'You can review all your data from the Settings page'}</li>
              <li><span className="text-white font-medium">{isAr ? 'التصحيح' : 'Correction'}</span> — {isAr ? 'يمكنك تعديل اسم ملفك الشخصي وإعداداته في أي وقت' : 'You can edit your profile name and settings at any time'}</li>
              <li><span className="text-white font-medium">{isAr ? 'الحذف' : 'Deletion'}</span> — {isAr ? 'حذف الحساب من الإعدادات يمسح جميع بياناتك نهائياً من قاعدة البيانات' : 'Deleting your account from Settings permanently erases all your data from the database'}</li>
              <li><span className="text-white font-medium">{isAr ? 'تعطيل ملفات الارتباط' : 'Cookie control'}</span> — {isAr ? 'يمكنك مسح ملفات تعريف الارتباط الخاصة بالمنصة من إعدادات المتصفح في أي وقت' : 'You can clear platform cookies from your browser settings at any time'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٧. تحديثات هذه السياسة' : '7. Policy Updates'}
            </h2>
            <p>
              {isAr
                ? 'قد نحدّث هذه السياسة من حين لآخر. سيُشار إلى أي تحديث بتغيير تاريخ "آخر تحديث" في أعلى الصفحة. استمرارك في استخدام المنصة بعد أي تحديث يعني موافقتك على الشروط المُحدَّثة.'
                : 'We may update this policy from time to time. Any update will be indicated by changing the "Last Updated" date at the top of this page. Continued use of the platform after any update constitutes acceptance of the revised policy.'}
            </p>
          </section>

          <section className="border-t border-[var(--border-subtle)] pt-8">
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٨. تواصل معنا' : '8. Contact'}
            </h2>
            <p>
              {isAr
                ? 'لأي استفسارات تتعلق بهذه السياسة أو بياناتك، يرجى التواصل معنا عبر '
                : 'For any questions regarding this policy or your data, please contact us via '}
              <a href="/contact" className="text-[#E50914] hover:underline">
                {isAr ? 'صفحة التواصل' : 'the Contact page'}
              </a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
