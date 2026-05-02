import type { StreamCandidate, StreamResolveResult, StreamResult, StreamVariant } from '@/types/stream'
import { fasselhdAdapter } from './fasselhd'
import { vidbomAdapter, doodstreamAdapter, streamwishAdapter, filemoonAdapter } from './vidbom'
import { flattenCandidates, resolveRealDebridCandidates } from './realdebrid'
import { vidsrcAdapter } from './vidsrc'

function variantFromStream(stream: StreamResult): StreamVariant {
  return {
    url: stream.url,
    type: stream.type,
    variant: stream.type === 'embed' ? 'embed' : stream.type === 'hls' ? 'hls' : stream.type === 'dash' ? 'dash' : 'direct',
    label: stream.label || stream.server,
    compatibility: stream.type === 'embed' || stream.type === 'hls' ? 'fallback' : 'unknown',
  }
}

function candidateFromLegacyStream(stream: StreamResult, index: number, originalLanguage?: string): StreamCandidate {
  const candidateId = `${stream.server}:${index}`
  return {
    id: candidateId,
    provider: stream.server,
    server: stream.server,
    isRealDebrid: stream.isRealDebrid,
    rank: index + 1,
    score: stream.isRealDebrid ? 500 : 50,
    quality: stream.quality,
    fileName: stream.fileName,
    originalLanguage: stream.originalLanguage || originalLanguage,
    audioLanguages: stream.audioLanguages,
    audioTrackConfidence: stream.audioTrackConfidence,
    audioTrackSource: stream.audioTrackSource,
    isDubbed: stream.isDubbed,
    dubPenalty: stream.dubPenalty,
    selectedAudioLanguage: stream.selectedAudioLanguage,
    verifiedMatch: !stream.isRealDebrid,
    variants: [variantFromStream(stream)],
  }
}

function flattenLegacyCandidates(candidates: StreamCandidate[]): StreamResult[] {
  return candidates.flatMap((candidate) => candidate.variants.map((variant) => ({
    url: variant.url,
    server: candidate.server,
    type: variant.type,
    isRealDebrid: candidate.isRealDebrid,
    quality: candidate.quality,
    label: variant.label,
    fileName: candidate.fileName,
    candidateId: candidate.id,
    variant: variant.variant,
    rank: candidate.rank,
    compatibility: variant.compatibility,
    verifiedMatch: candidate.verifiedMatch,
    score: candidate.score,
    originalLanguage: candidate.originalLanguage,
    audioLanguages: candidate.audioLanguages,
    audioTrackConfidence: candidate.audioTrackConfidence,
    audioTrackSource: candidate.audioTrackSource,
    isDubbed: candidate.isDubbed,
    dubPenalty: candidate.dubPenalty,
    selectedAudioLanguage: candidate.selectedAudioLanguage,
  })))
}

export async function resolveStreamGraph(
  tmdbId: string,
  type: 'movie' | 'episode',
  season?: number,
  episode?: number,
  originalLanguage?: string
): Promise<StreamResolveResult> {
  const PREMIUM_TIMEOUT = 8000 // 8s for premium sources

  const premiumAdapters = [vidsrcAdapter]
  const secondaryAdapters = [fasselhdAdapter, vidbomAdapter, doodstreamAdapter, streamwishAdapter, filemoonAdapter]

  const candidates: StreamCandidate[] = []

  const [rdCandidates, premiumResults] = await Promise.all([
    Promise.race([
      resolveRealDebridCandidates(tmdbId, type, season, episode, originalLanguage),
      new Promise<StreamCandidate[]>((resolve) => setTimeout(() => resolve([]), PREMIUM_TIMEOUT)),
    ]),
    Promise.allSettled(
      premiumAdapters.map(adapter =>
        Promise.race([
          adapter.resolve(tmdbId, type, season, episode),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), PREMIUM_TIMEOUT)
          ),
        ])
      )
    ),
  ])

  candidates.push(...rdCandidates)

  for (const result of premiumResults) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      const start = candidates.length
      candidates.push(...result.value.map((stream, index) => candidateFromLegacyStream(stream, start + index, originalLanguage)))
    }
  }

  const remainingWait = candidates.some(s => s.isRealDebrid) ? 2000 : 4000

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
      const start = candidates.length
      candidates.push(...result.value.map((stream, index) => candidateFromLegacyStream(stream, start + index, originalLanguage)))
    }
  }

  const qualityScore = (q?: string) => {
    if (!q) return 0
    if (q.includes('2160') || q.includes('4k')) return 4
    if (q.includes('1080')) return 3
    if (q.includes('720')) return 2
    if (q.includes('480')) return 1
    return 0
  }

  candidates.sort((a, b) => {
    if (a.isRealDebrid && !b.isRealDebrid) return -1
    if (!a.isRealDebrid && b.isRealDebrid) return 1

    if ((a.score || 0) !== (b.score || 0)) return (b.score || 0) - (a.score || 0)

    const scoreA = qualityScore(a.quality)
    const scoreB = qualityScore(b.quality)
    if (scoreA !== scoreB) return scoreB - scoreA

    return 0
  })

  const rankedCandidates = candidates.map((candidate, index) => ({ ...candidate, rank: index + 1 }))
  const streams = [
    ...flattenCandidates(rankedCandidates.filter(candidate => candidate.isRealDebrid)),
    ...flattenLegacyCandidates(rankedCandidates.filter(candidate => !candidate.isRealDebrid)),
  ]

  return { streams, candidates: rankedCandidates }
}

export async function resolveStreams(
  tmdbId: string,
  type: 'movie' | 'episode',
  season?: number,
  episode?: number,
  originalLanguage?: string
): Promise<StreamResult[]> {
  return (await resolveStreamGraph(tmdbId, type, season, episode, originalLanguage)).streams
}
