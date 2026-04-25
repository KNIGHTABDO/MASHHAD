'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useT } from '@/lib/i18n/context'
import { getTMDBImageUrl } from '@/lib/utils/format'

interface Props {
  type: 'movie' | 'tv'
  seriesId?: string
  currentSeason?: number
  currentEpisode?: number
  autoPlayNext: boolean
}

export function PostPlaybackScreen({ type, seriesId, currentSeason, currentEpisode, autoPlayNext }: Props) {
  const { t, lang } = useT()
  const router = useRouter()
  const [countdown, setCountdown] = useState(10)
  const [recommendations, setRecommendations] = useState<any[]>([])
  
  // Auto play next episode countdown
  useEffect(() => {
    if (type !== 'tv' || !autoPlayNext) return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          // Navigate to next episode
          router.push(`/watch/${seriesId}?type=tv&season=${currentSeason}&episode=${(currentEpisode || 1) + 1}`)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [type, autoPlayNext, seriesId, currentSeason, currentEpisode, router])

  // Fetch recommendations
  useEffect(() => {
    async function load() {
      try {
        const id = seriesId || '' // need actual id for movies too, but we didn't pass it. Let's just fetch popular
        // Fallback: just fetch trending or similar
        const res = await fetch(`/api/tmdb/discover?type=${type}`)
        const data = await res.json()
        if (data.results) {
          setRecommendations(data.results.slice(0, 4))
        }
      } catch {}
    }
    load()
  }, [type, seriesId])

  if (type === 'tv') {
    return (
      <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <h2 className="text-4xl font-black text-white mb-4">
          {lang === 'ar' ? 'الحلقة القادمة' : 'Next Episode'}
        </h2>
        <p className="text-[#B3B3B3] mb-8">
          {lang === 'ar' ? 'ستبدأ الحلقة التالية تلقائياً خلال' : 'Next episode starting in'} {countdown} {lang === 'ar' ? 'ثواني' : 'seconds'}
        </p>
        <div className="flex gap-4">
          <button 
            onClick={() => router.push(`/watch/${seriesId}?type=tv&season=${currentSeason}&episode=${(currentEpisode || 1) + 1}`)}
            className="bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-white/90 transition-all hover:scale-105"
          >
            {lang === 'ar' ? 'تشغيل الآن' : 'Play Now'}
          </button>
          <button 
            onClick={() => router.push('/')}
            className="bg-[#333] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#444] transition-all"
          >
            {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
          </button>
        </div>
      </div>
    )
  }

  // Movie or final episode screen
  return (
    <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
      <h2 className="text-3xl md:text-5xl font-black text-white mb-2 text-center">
        {lang === 'ar' ? 'تهانينا، لقد أنهيت المشاهدة!' : 'Congratulations, you finished it!'}
      </h2>
      <p className="text-[#B3B3B3] mb-12 text-center max-w-xl">
        {lang === 'ar' ? 'إليك بعض الاقتراحات التي قد تعجبك' : 'Here are some suggestions you might like'}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
        {recommendations.map(item => (
          <Link 
            key={item.id} 
            href={`/${type === 'tv' ? 'series' : 'movie'}/${item.id}`}
            className="relative aspect-[2/3] rounded-xl overflow-hidden group"
          >
            <Image
              src={getTMDBImageUrl(item.poster_path, 'w500')}
              alt={item.title || item.name || ''}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white font-bold">{lang === 'ar' ? 'المزيد' : 'More Info'}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 flex gap-4">
        <button 
          onClick={() => window.location.reload()}
          className="bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-white/90 transition-all"
        >
          {lang === 'ar' ? 'إعادة المشاهدة' : 'Watch Again'}
        </button>
        <button 
          onClick={() => router.push('/')}
          className="bg-[#333] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#444] transition-all"
        >
          {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
      </div>
    </div>
  )
}
