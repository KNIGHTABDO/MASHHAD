'use client'

import { useT } from '@/lib/i18n/context'

export default function PrivacyPolicyPage() {
  const { lang } = useT()
  const isAr = lang === 'ar'

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </h1>
        <p className="text-sm text-[#666] mb-8">
          {isAr ? 'آخر تحديث: ٢٦ أبريل ٢٠٢٦' : 'Last Updated: April 26, 2026'}
        </p>

        <div className="space-y-8 text-[#B3B3B3] text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '١. المعلومات التي نجمعها' : '1. Information We Collect'}
            </h2>
            <p>
              {isAr
                ? 'عند إنشاء حساب، نجمع عنوان بريدك الإلكتروني وكلمة المرور المشفرة. كما نقوم بتخزين تفضيلات المشاهدة الخاصة بك، مثل تقدم المشاهدة وقائمتك الشخصية وتفضيلات اللغة، لتحسين تجربتك على المنصة.'
                : 'When you create an account, we collect your email address and an encrypted password. We also store your viewing preferences, such as watch progress, your personal list, and language settings, to improve your experience on the platform.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٢. كيف نستخدم معلوماتك' : '2. How We Use Your Information'}
            </h2>
            <ul className={`list-disc ${isAr ? 'pr-5' : 'pl-5'} space-y-2`}>
              <li>{isAr ? 'توفير وصيانة خدمتنا' : 'To provide and maintain our service'}</li>
              <li>{isAr ? 'حفظ تقدم المشاهدة واستئناف المحتوى' : 'To save watch progress and resume content'}</li>
              <li>{isAr ? 'تخصيص تجربتك وتوصياتك' : 'To personalize your experience and recommendations'}</li>
              <li>{isAr ? 'إرسال إشعارات الخدمة الضرورية' : 'To send essential service notifications'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٣. تخزين البيانات والأمان' : '3. Data Storage & Security'}
            </h2>
            <p>
              {isAr
                ? 'يتم تخزين بياناتك بشكل آمن على خوادم Supabase مع تشفير على مستوى الصفوف. نحن لا نبيع أو نشارك أو نؤجر معلوماتك الشخصية لأي طرف ثالث.'
                : 'Your data is securely stored on Supabase servers with row-level encryption. We do not sell, share, or rent your personal information to any third parties.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٤. ملفات تعريف الارتباط' : '4. Cookies'}
            </h2>
            <p>
              {isAr
                ? 'نستخدم ملفات تعريف الارتباط الأساسية فقط للحفاظ على جلسة تسجيل الدخول وتفضيلات اللغة والملف الشخصي النشط. لا نستخدم أي ملفات تعريف ارتباط للتتبع أو الإعلانات.'
                : 'We use only essential cookies to maintain your login session, language preference, and active profile. We do not use any tracking or advertising cookies.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٥. خدمات الطرف الثالث' : '5. Third-Party Services'}
            </h2>
            <p>
              {isAr
                ? 'نستخدم واجهات برمجة تطبيقات خارجية (TMDB، OpenSubtitles) للحصول على البيانات الوصفية والترجمات. يرجى مراجعة سياسات الخصوصية الخاصة بهذه الخدمات لمزيد من المعلومات.'
                : 'We use external APIs (TMDB, OpenSubtitles) to fetch metadata and subtitles. Please review the privacy policies of these services for more information.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٦. حقوقك' : '6. Your Rights'}
            </h2>
            <p>
              {isAr
                ? 'يحق لك حذف حسابك وجميع البيانات المرتبطة به في أي وقت من خلال الإعدادات. عند حذف الحساب، يتم مسح جميع بياناتك الشخصية بشكل دائم.'
                : 'You have the right to delete your account and all associated data at any time through Settings. Upon account deletion, all your personal data is permanently erased.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٧. التواصل' : '7. Contact'}
            </h2>
            <p>
              {isAr
                ? 'للأسئلة حول سياسة الخصوصية، يرجى التواصل معنا عبر صفحة الإعدادات.'
                : 'For questions about this Privacy Policy, please contact us through the Settings page.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
