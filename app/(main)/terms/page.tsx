'use client'

import { useT } from '@/lib/i18n/context'

export default function TermsPage() {
  const { lang } = useT()
  const isAr = lang === 'ar'

  return (
    <div className={`min-h-screen py-16 px-4 sm:px-6 lg:px-8 ${isAr ? 'text-right' : 'text-left'}`}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black text-white mb-3">
          {isAr ? 'شروط الاستخدام' : 'Terms of Service'}
        </h1>
        <p className="text-sm text-[#555] mb-10 border-b border-[var(--border-subtle)] pb-6">
          {isAr ? 'آخر تحديث: ٢٦ أبريل ٢٠٢٦' : 'Last Updated: April 26, 2026'}
        </p>

        <div className="space-y-10 text-[#B3B3B3] text-sm leading-7">

          {/* Intro */}
          <section>
            <p>
              {isAr
                ? 'يرجى قراءة هذه الشروط بعناية قبل استخدام منصة مشهد. باستخدامك للمنصة، فإنك توافق على الالتزام بجميع الشروط الواردة أدناه. إذا كنت لا توافق على أي منها، يرجى التوقف عن استخدام المنصة.'
                : 'Please read these terms carefully before using Mashhad. By using the platform, you agree to be bound by all terms listed below. If you disagree with any of them, please stop using the platform.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '١. طبيعة المنصة' : '1. Nature of the Platform'}
            </h2>
            <p>
              {isAr
                ? 'مشهد هي منصة تجميع (Aggregator) تعمل كواجهة للوصول إلى محتوى متاح عبر واجهات برمجة تطبيقات خارجية (Real-Debrid، VidSrc، Torrentio). مشهد لا تستضيف أي محتوى إعلامي، ولا تنتج محتوى، ولا تدّعي امتلاك أي حقوق على الأفلام أو المسلسلات أو البيانات الوصفية المعروضة. جميع الحقوق محفوظة لأصحابها الأصليين.'
                : 'Mashhad is an aggregation platform that acts as an interface to access content available through external APIs (Real-Debrid, VidSrc, Torrentio). Mashhad does not host any media content, does not produce content, and does not claim any rights over the movies, series, or metadata displayed. All rights belong to their original owners.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٢. الحسابات والملفات الشخصية' : '2. Accounts & Profiles'}
            </h2>
            <ul className={`list-disc ${isAr ? 'pr-5' : 'pl-5'} space-y-2`}>
              <li>{isAr ? 'يجب أن يكون عمرك ١٣ عامًا أو أكثر لإنشاء حساب' : 'You must be at least 13 years old to create an account'}</li>
              <li>{isAr ? 'أنت مسؤول بالكامل عن الحفاظ على سرية بيانات تسجيل الدخول الخاصة بك' : 'You are fully responsible for maintaining the confidentiality of your login credentials'}</li>
              <li>{isAr ? 'يُسمح بإنشاء حتى ٥ ملفات شخصية لكل حساب' : 'Up to 5 profiles are allowed per account'}</li>
              <li>{isAr ? 'لا يجوز مشاركة حسابك مع أطراف خارجية أو بيعه أو التنازل عنه' : 'You may not share, sell, or transfer your account to external parties'}</li>
              <li>{isAr ? 'أنت مسؤول عن جميع الأنشطة التي تتم تحت حسابك' : 'You are responsible for all activity that occurs under your account'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٣. الاستخدام المسموح به' : '3. Acceptable Use'}
            </h2>
            <p className="mb-3">
              {isAr ? 'بموافقتك على هذه الشروط، تلتزم بعدم القيام بما يلي:' : 'By agreeing to these terms, you commit to not:'}
            </p>
            <ul className={`list-disc ${isAr ? 'pr-5' : 'pl-5'} space-y-2`}>
              <li>{isAr ? 'محاولة اختراق أو تعطيل أي جزء من البنية التحتية للمنصة' : 'Attempting to hack or disrupt any part of the platform infrastructure'}</li>
              <li>{isAr ? 'استخدام أنظمة آلية (بوتات، سكريبتات) لاستخراج البيانات أو إساءة استخدام واجهات API' : 'Using automated systems (bots, scripts) to scrape data or abuse the API endpoints'}</li>
              <li>{isAr ? 'إعادة توزيع أو بث أو تسجيل أي محتوى من المنصة دون إذن مسبق' : 'Redistributing, broadcasting, or recording any content from the platform without prior permission'}</li>
              <li>{isAr ? 'إنشاء حسابات متعددة لأغراض مسيئة أو للتحايل على أي قيود' : 'Creating multiple accounts for abusive purposes or to circumvent any restrictions'}</li>
              <li>{isAr ? 'محاولة انتحال هوية مستخدم آخر أو موظف في المنصة' : 'Attempting to impersonate another user or a platform employee'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٤. حقوق الملكية الفكرية' : '4. Intellectual Property'}
            </h2>
            <p>
              {isAr
                ? 'تصميم المنصة وكودها المصدري وعلامتها التجارية (مشهد) هي ملكية خاصة بالفريق المطور. المحتوى الإعلامي (الأفلام والمسلسلات والبيانات الوصفية) مملوك بالكامل لأصحابه الأصليين وليس للمنصة أي علاقة بملكيته. بيانات TMDB المستخدمة تخضع لشروط استخدام TMDB.'
                : 'The platform design, source code, and brand (Mashhad) are proprietary to the development team. Media content (movies, series, metadata) is owned entirely by its original rights holders and the platform has no ownership relationship with it. TMDB data used is subject to TMDB\'s own terms of use.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٥. توفر الخدمة والتعديلات' : '5. Availability & Changes'}
            </h2>
            <p>
              {isAr
                ? 'نسعى لتوفير خدمة مستمرة وعالية الجودة، لكننا لا نضمن عدم انقطاعها في أي وقت. قد تخضع المنصة لفترات صيانة أو تحديثات مجدولة. نحتفظ بالحق في تعديل أو تعليق أو إيقاف أي ميزة أو خدمة دون إشعار مسبق وبدون أي مسؤولية تجاهك.'
                : 'We strive to provide continuous, high-quality service, but we do not guarantee uninterrupted availability at any time. The platform may undergo scheduled maintenance or updates. We reserve the right to modify, suspend, or discontinue any feature or service without prior notice and without any liability to you.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٦. إنهاء الحساب' : '6. Account Termination'}
            </h2>
            <p>
              {isAr
                ? 'نحتفظ بالحق في تعليق أو إنهاء أي حساب يُشتبه في انتهاكه لهذه الشروط، وذلك دون إشعار مسبق وبتقديرنا المطلق. يمكنك حذف حسابك بشكل كامل وفوري في أي وقت من خلال صفحة الإعدادات، وسيُمسح جميع بياناتك بشكل دائم.'
                : 'We reserve the right to suspend or terminate any account suspected of violating these terms, without prior notice and at our sole discretion. You may delete your account fully and immediately at any time through the Settings page, and all your data will be permanently erased.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٧. إخلاء المسؤولية' : '7. Disclaimer of Warranties'}
            </h2>
            <p>
              {isAr
                ? 'يتم تقديم المنصة "كما هي" وبدون أي ضمانات صريحة أو ضمنية من أي نوع. لن نكون مسؤولين عن أي خسائر أو أضرار مباشرة أو غير مباشرة أو عرضية ناتجة عن استخدام المنصة أو عدم القدرة على استخدامها. لا نضمن دقة أو اكتمال أي محتوى أو بيانات وصفية معروضة.'
                : 'The platform is provided "as is" without warranties of any kind, express or implied. We shall not be liable for any direct, indirect, or incidental losses or damages arising from the use of or inability to use the platform. We do not guarantee the accuracy or completeness of any content or metadata displayed.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٨. تحديث الشروط' : '8. Changes to These Terms'}
            </h2>
            <p>
              {isAr
                ? 'نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم الإشارة إلى التحديثات بتغيير التاريخ الوارد في أعلى الصفحة. استمرارك في استخدام المنصة بعد أي تحديث يُشكّل موافقة ضمنية على الشروط الجديدة.'
                : 'We reserve the right to modify these terms at any time. Updates will be indicated by a change in the date shown at the top of this page. Continued use of the platform after any update constitutes implicit acceptance of the new terms.'}
            </p>
          </section>

          <section className="border-t border-[var(--border-subtle)] pt-8">
            <h2 className="text-lg font-bold text-white mb-3">
              {isAr ? '٩. القانون المطبّق' : '9. Governing Law'}
            </h2>
            <p>
              {isAr
                ? 'تخضع هذه الشروط وتُفسَّر وفقاً للقوانين المعمول بها. أي نزاع ينشأ عن هذه الشروط يجب أن يُحسم بالطرق الودية أولاً.'
                : 'These terms are governed by and construed in accordance with applicable laws. Any dispute arising from these terms should be resolved through amicable means first.'}
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
