import { cookies } from 'next/headers'
import { ar } from './ar'
import { en } from './en'

export async function getServerT() {
  try {
    const cookieStore = await cookies()
    const lang = cookieStore.get('mashhad-lang')?.value
    return { t: lang === 'en' ? en : ar, lang: (lang === 'en' ? 'en' : 'ar') as 'ar' | 'en' }
  } catch {
    return { t: ar, lang: 'ar' as const }
  }
}
