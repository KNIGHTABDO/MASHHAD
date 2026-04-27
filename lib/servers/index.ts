import type { StreamResult } from '@/types/stream'
import { fasselhdAdapter } from './fasselhd'
import { vidbomAdapter, doodstreamAdapter, streamwishAdapter, filemoonAdapter } from './vidbom'
import { realDebridAdapter } from './realdebrid'
import { vidsrcAdapter } from './vidsrc'

export async function resolveStreams(
  tmdbId: string,
  type: 'movie' | 'episode',
  season?: number,
  episode?: number
): Promise<StreamResult[]> {
  const PREMIUM_TIMEOUT = 8000 // 8s for premium sources

  // Start all in parallel but with different internal priorities/timeouts if needed
  // For now, let's try a "fast-path" for RealDebrid
  const premiumAdapters = [realDebridAdapter, vidsrcAdapter]
  const secondaryAdapters = [fasselhdAdapter, vidbomAdapter, doodstreamAdapter, streamwishAdapter, filemoonAdapter]

  const streams: StreamResult[] = []

  // Resolve premium sources first (or with a shorter wait)
  const premiumResults = await Promise.allSettled(
    premiumAdapters.map(adapter =>
      Promise.race([
        adapter.resolve(tmdbId, type, season, episode),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), PREMIUM_TIMEOUT)
        ),
      ])
    )
  )

  for (const result of premiumResults) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      streams.push(...result.value)
    }
  }

  // If we already have good RealDebrid streams, we can do a very short race for the rest
  // or just resolve them if they are already done.
  const remainingWait = streams.some(s => s.isRealDebrid) ? 2000 : 4000

  const secondaryResults = await Promise.allSettled(
    secondaryAdapters.map(adapter =>
      Promise.race([
        adapter.resolve(tmdbId, type, season, episode),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), remainingWait)
        ),
      ])
    )
  )

  for (const result of secondaryResults) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      streams.push(...result.value)
    }
  }

  // Sort: RealDebrid first, then by quality
  const qualityScore = (q?: string) => {
    if (!q) return 0
    if (q.includes('2160') || q.includes('4k')) return 4
    if (q.includes('1080')) return 3
    if (q.includes('720')) return 2
    if (q.includes('480')) return 1
    return 0
  }

  streams.sort((a, b) => {
    if (a.isRealDebrid && !b.isRealDebrid) return -1
    if (!a.isRealDebrid && b.isRealDebrid) return 1
    
    // Within same category, sort by quality
    const scoreA = qualityScore(a.quality)
    const scoreB = qualityScore(b.quality)
    if (scoreA !== scoreB) return scoreB - scoreA
    
    // If quality is same, prefer HLS for browser compatibility (unless it's RD direct)
    if (a.type === 'hls' && b.type !== 'hls') return -1
    if (a.type !== 'hls' && b.type === 'hls') return 1
    
    return 0
  })

  return streams
}
