'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/context'
import { slideUp } from '@/lib/animations'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { t, lang } = useT()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters')
      return
    }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(t.auth.registerError + ': ' + error.message)
      } else {
        router.push('/profiles/manage')
        router.refresh()
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#141414] to-[#0A0A0A]" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 80% 50%, #E50914 0%, transparent 50%), radial-gradient(circle at 20% 80%, #0071E3 0%, transparent 40%)'
      }} />

      <motion.div {...slideUp} className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-tight">مشهد</h1>
          <div className="w-12 h-1 bg-[#E50914] mx-auto mt-2 rounded-full" />
        </div>

        <div className="glass rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center">{t.auth.register}</h2>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm text-[#B3B3B3] mb-2">{t.auth.email}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#1F1F1F] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-[#666] focus:border-[#0071E3] transition-colors outline-none"
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm text-[#B3B3B3] mb-2">{t.auth.password}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#1F1F1F] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-[#666] focus:border-[#0071E3] transition-colors outline-none"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm text-[#B3B3B3] mb-2">{t.auth.confirmPassword}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-[#1F1F1F] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-[#666] focus:border-[#0071E3] transition-colors outline-none"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[#E50914] text-sm bg-[rgba(229,9,20,0.1)] rounded-lg px-4 py-3"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#E50914] hover:bg-[#C4070F] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isPending ? t.content.loading : t.auth.register}
            </button>
          </form>

          <p className="text-center text-[#666] text-sm mt-6">
            {t.auth.haveAccount}{' '}
            <Link href="/login" className="text-[#0071E3] hover:underline font-medium">
              {t.auth.login}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
