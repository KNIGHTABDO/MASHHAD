import type { StreamResult, ServerAdapter } from '@/types/stream'
import { fasselhdAdapter } from './fasselhd'
import { vidbomAdapter, doodstreamAdapter, streamwishAdapter, filemoonAdapter } from './vidbom'
import { realDebridAdapter } from './realdebrid'
import { vidsrcAdapter } from './vidsrc'

const ADAPTERS: ServerAdapter[] = [
  realDebridAdapter,   // Best quality — first
  vidsrcAdapter,       // Embed alternative
  fasselhdAdapter,
  vidbomAdapter,
  doodstreamAdapter,
  streamwishAdapter,
  filemoonAdapter,
]

export async function resolveStreams(
  tmdbId: string,
  type: 'movie' | 'episode',
  season?: number,
  episode?: number
): Promise<StreamResult[]> {
  const TIMEOUT_MS = 12000

  const results = await Promise.allSettled(
    ADAPTERS.map(adapter =>
      Promise.race([
        adapter.resolve(tmdbId, type, season, episode),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
        ),
      ])
    )
  )

  const streams: StreamResult[] = []
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      streams.push(...result.value)
    }
  }

  // Sort: RealDebrid first, then by quality
  const qualityScore = (q?: string) => {
    if (!q) return 0
    if (q.includes('1080')) return 3
    if (q.includes('720')) return 2
    if (q.includes('480')) return 1
    return 0
  }

  streams.sort((a, b) => {
    if (a.isRealDebrid && !b.isRealDebrid) return -1
    if (!a.isRealDebrid && b.isRealDebrid) return 1
    return qualityScore(b.quality) - qualityScore(a.quality)
  })

  return streams
}
