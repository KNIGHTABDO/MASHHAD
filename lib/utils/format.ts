import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRuntime(minutes: number, lang: string = 'ar'): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  
  if (lang === 'en') {
    if (h === 0) return `${m} min`
    if (m === 0) return `${h} hr`
    return `${h}h ${m}m`
  }
  
  if (h === 0) return `${m} دقيقة`
  if (m === 0) return `${h} ساعة`
  return `${h}س ${m}د`
}

export function formatDate(dateString: string, lang: string = 'ar'): string {
  if (!dateString) return ''
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString))
}

export function formatYear(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).getFullYear().toString()
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

export function formatProgress(seconds: number, total: number): string {
  const pct = Math.round((seconds / total) * 100)
  return `${pct}%`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function getTMDBImageUrl(path: string | null, size: 'w300' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'): string {
  if (!path) return '/placeholder-poster.jpg'
  return `https://image.tmdb.org/t/p/${size}${path}`
}
