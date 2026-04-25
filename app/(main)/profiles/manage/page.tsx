'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/context'
import type { ProfileFormData } from '@/types/profile'
import { slideUp } from '@/lib/animations'

const AVATAR_COLORS = [
  '#E50914', '#0071E3', '#F5A623', '#00A878',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#A855F7',
]

const defaultForm: ProfileFormData = {
  name: '',
  avatar_color: '#E50914',
  is_kids: false,
  maturity_level: 'all',
  language: 'ar',
  auto_play_next: true,
  auto_skip_intro: true,
  subtitle_language: 'ar',
}

function ManageProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [form, setForm] = useState<ProfileFormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const { t, lang } = useT()

  useEffect(() => {
    if (editId) {
      loadProfile(editId)
      setIsEdit(true)
    }
  }, [editId])

  async function loadProfile(id: string) {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (data) {
      setForm({
        name: data.name,
        avatar_color: data.avatar_color,
        is_kids: data.is_kids,
        maturity_level: data.maturity_level,
        language: data.language,
        auto_play_next: data.auto_play_next,
        auto_skip_intro: data.auto_skip_intro,
        subtitle_language: data.subtitle_language,
      })
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError(t.errors.unauthorized); setSaving(false); return }

    if (isEdit && editId) {
      const { error } = await supabase.from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId)
      if (error) setError(error.message)
      else router.push('/profiles')
    } else {
      const { error } = await supabase.from('profiles').insert({ ...form, user_id: user.id })
      if (error) setError(error.message)
      else router.push('/profiles')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!editId || !confirm(t.profiles.deleteConfirm)) return
    const supabase = createClient()
    await supabase.from('profiles').delete().eq('id', editId)
    router.push('/profiles')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <motion.div {...slideUp} className="w-full max-w-lg">
        <h1 className="text-2xl font-black text-center mb-8">
          {isEdit ? t.profiles.editProfile : t.profiles.addProfile}
        </h1>

        {/* Avatar preview */}
        <div className="flex justify-center mb-8">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-xl transition-colors duration-300"
            style={{ backgroundColor: form.avatar_color }}
          >
            {form.name[0] || '؟'}
          </div>
        </div>

        <form onSubmit={handleSave} className="glass rounded-2xl p-8 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm text-[#B3B3B3] mb-2">{t.profiles.name}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              maxLength={20}
              className="w-full bg-[#1F1F1F] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white outline-none focus:border-[#0071E3] transition-colors"
              placeholder={lang === 'ar' ? 'مثال: علي' : 'e.g. Ali'}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm text-[#B3B3B3] mb-3">{lang === 'ar' ? 'لون الملف الشخصي' : 'Profile Color'}</label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, avatar_color: color }))}
                  className={`w-9 h-9 rounded-xl transition-all hover:scale-110 ${
                    form.avatar_color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141414] scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Kids toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t.profiles.kidsMode}</label>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_kids: !f.is_kids, maturity_level: !f.is_kids ? 'kids' : 'all' }))}
              className={`w-12 h-6 rounded-full transition-all duration-300 ${form.is_kids ? 'bg-[#E50914]' : 'bg-[#333]'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${form.is_kids ? 'translate-x-[-2px]' : 'translate-x-[26px]'}`} />
            </button>
          </div>

          {/* Maturity */}
          {!form.is_kids && (
            <div>
              <label className="block text-sm text-[#B3B3B3] mb-2">{t.profiles.maturityLevel}</label>
              <div className="flex gap-2">
                {(['kids', 'teen', 'all'] as const).map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, maturity_level: level }))}
                    className={`flex-1 py-2 rounded-xl text-sm transition-all ${
                      form.maturity_level === level ? 'bg-white text-black font-bold' : 'bg-[#1F1F1F] text-[#B3B3B3]'
                    }`}
                  >
                    {t.maturity[level]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-play & skip */}
          {[
            { key: 'auto_play_next', label: t.settings.autoPlayNext },
            { key: 'auto_skip_intro', label: t.settings.autoSkipIntro },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm">{label}</label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof ProfileFormData] }))}
                className={`w-12 h-6 rounded-full transition-all duration-300 ${form[key as keyof ProfileFormData] ? 'bg-[#0071E3]' : 'bg-[#333]'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${form[key as keyof ProfileFormData] ? 'translate-x-[-2px]' : 'translate-x-[26px]'}`} />
              </button>
            </div>
          ))}

          {error && (
            <p className="text-[#E50914] text-sm bg-[rgba(229,9,20,0.1)] rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 bg-[#E50914] hover:bg-[#C4070F] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all"
            >
              {saving ? t.content.loading : t.profiles.save}
            </button>
            <button
              type="button"
              onClick={() => router.push('/profiles')}
              className="flex-1 bg-[#1F1F1F] border border-[var(--border-visible)] text-[#B3B3B3] font-medium py-3.5 rounded-xl hover:text-white transition-all"
            >
              {t.profiles.cancel}
            </button>
          </div>

          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-full text-[#E50914] text-sm py-2 hover:underline"
            >
              {t.profiles.deleteProfile}
            </button>
          )}
        </form>
      </motion.div>
    </div>
  )
}

export default function ManageProfilesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">...</div>}>
      <ManageProfileContent />
    </Suspense>
  )
}
