'use client'

import { useT } from '@/lib/i18n/context'

export default function TermsPage() {
  const { lang } = useT()
  const isAr = lang === 'ar'

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          {isAr ? 'شروط الاستخدام' : 'Terms of Service'}
        </h1>
        <p className="text-sm text-[#666] mb-8">
          {isAr ? 'آخر تحديث: ٢٦ أبريل ٢٠٢٦' : 'Last Updated: April 26, 2026'}
        </p>

        <div className="space-y-8 text-[#B3B3B3] text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '١. قبول الشروط' : '1. Acceptance of Terms'}
            </h2>
            <p>
              {isAr
                ? 'باستخدامك لمنصة مشهد، فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق على أي جزء من هذه الشروط، يجب عليك التوقف عن استخدام المنصة.'
                : 'By using the Mashhad platform, you agree to be bound by these terms. If you do not agree with any part of these terms, you must stop using the platform.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٢. الحسابات' : '2. Accounts'}
            </h2>
            <ul className={`list-disc ${isAr ? 'pr-5' : 'pl-5'} space-y-2`}>
              <li>{isAr ? 'يجب أن يكون عمرك ١٣ عامًا أو أكثر لإنشاء حساب' : 'You must be 13 years or older to create an account'}</li>
              <li>{isAr ? 'أنت مسؤول عن الحفاظ على أمان حسابك' : 'You are responsible for maintaining the security of your account'}</li>
              <li>{isAr ? 'يُسمح بإنشاء حتى ٥ ملفات شخصية لكل حساب' : 'Up to 5 profiles are allowed per account'}</li>
              <li>{isAr ? 'لا يجوز مشاركة بيانات تسجيل الدخول مع أطراف خارجية' : 'You may not share login credentials with external parties'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٣. الاستخدام المقبول' : '3. Acceptable Use'}
            </h2>
            <p className="mb-3">
              {isAr ? 'عند استخدام المنصة، توافق على عدم:' : 'When using the platform, you agree not to:'}
            </p>
            <ul className={`list-disc ${isAr ? 'pr-5' : 'pl-5'} space-y-2`}>
              <li>{isAr ? 'محاولة اختراق أو إعاقة البنية التحتية للمنصة' : 'Attempt to hack or disrupt the platform infrastructure'}</li>
              <li>{isAr ? 'استخدام أنظمة آلية لاستخراج البيانات من المنصة' : 'Use automated systems to scrape data from the platform'}</li>
              <li>{isAr ? 'إعادة توزيع أو بث المحتوى دون إذن' : 'Redistribute or rebroadcast content without permission'}</li>
              <li>{isAr ? 'إنشاء حسابات متعددة لأغراض مسيئة' : 'Create multiple accounts for abusive purposes'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٤. المحتوى والملكية الفكرية' : '4. Content & Intellectual Property'}
            </h2>
            <p>
              {isAr
                ? 'مشهد هي منصة تجميع تعمل كواجهة للوصول إلى محتوى متاح عبر واجهات برمجة تطبيقات مختلفة. جميع حقوق الأفلام والمسلسلات والبيانات الوصفية مملوكة لأصحابها. لا تدّعي مشهد ملكية أي محتوى وسائط يتم عرضه.'
                : 'Mashhad is an aggregation platform that serves as an interface to access content available through various APIs. All movie, series, and metadata rights belong to their respective owners. Mashhad does not claim ownership of any media content displayed.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٥. توفر الخدمة' : '5. Service Availability'}
            </h2>
            <p>
              {isAr
                ? 'نسعى لتوفير خدمة مستمرة، ولكن لا نضمن عدم انقطاعها. قد تخضع المنصة لفترات صيانة أو تحديثات. نحتفظ بالحق في تعديل أو إيقاف أي ميزة دون إشعار مسبق.'
                : 'We strive to provide continuous service but do not guarantee uninterrupted availability. The platform may undergo maintenance or updates. We reserve the right to modify or discontinue any feature without prior notice.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٦. إنهاء الحساب' : '6. Account Termination'}
            </h2>
            <p>
              {isAr
                ? 'نحتفظ بالحق في تعليق أو إنهاء أي حساب ينتهك هذه الشروط. يمكنك حذف حسابك في أي وقت من خلال صفحة الإعدادات.'
                : 'We reserve the right to suspend or terminate any account that violates these terms. You may delete your account at any time through the Settings page.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isAr ? '٧. إخلاء المسؤولية' : '7. Disclaimer'}
            </h2>
            <p>
              {isAr
                ? 'يتم تقديم المنصة "كما هي" دون أي ضمانات من أي نوع. لن نكون مسؤولين عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام المنصة.'
                : 'The platform is provided "as is" without warranties of any kind. We shall not be liable for any direct or indirect damages arising from the use of the platform.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
