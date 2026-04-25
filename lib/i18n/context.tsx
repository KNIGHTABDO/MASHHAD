'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ar } from './ar'
import { en } from './en'

type Lang = 'ar' | 'en'
type Translations = typeof ar

interface LanguageContextType {
  lang: Lang
  t: Translations
  setLang: (lang: Lang) => void
  dir: 'rtl' | 'ltr'
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ar',
  t: ar,
  setLang: () => {},
  dir: 'rtl',
})

const translations: Record<Lang, Translations> = { ar, en }

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')

  useEffect(() => {
    const saved = localStorage.getItem('mashhad-lang') as Lang | null
    if (saved && (saved === 'ar' || saved === 'en')) {
      setLangState(saved)
      applyLang(saved)
    }
  }, [])

  function applyLang(l: Lang) {
    document.documentElement.lang = l
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
  }

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('mashhad-lang', l)
    document.cookie = `mashhad-lang=${l};path=/;max-age=31536000`
    applyLang(l)
    // Reload to re-fetch TMDB data in the new language
    window.location.reload()
  }, [])

  return (
    <LanguageContext.Provider value={{
      lang,
      t: translations[lang],
      setLang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  return useContext(LanguageContext)
}

// For server components that can't use hooks, export static translations
export { ar, en }
