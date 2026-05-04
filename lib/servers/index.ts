import type { StreamCandidate, StreamResolveResult, StreamResult, StreamVariant } from '@/types/stream'
import { egydeadAdapter } from './egydead'

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
  
  const candidates: StreamCandidate[] = []

  try {
    // Only resolve from EgyDead without a timeout. Waiting as long as it takes.
    const egydeadStreams = await egydeadAdapter.resolve(tmdbId, type, season, episode)
    if (egydeadStreams && egydeadStreams.length > 0) {
      candidates.push(...egydeadStreams.map((stream, index) => candidateFromLegacyStream(stream, index, originalLanguage)))
    }
  } catch (err) {
    console.error('[Streams] EgyDead strictly isolated resolution failed:', err)
  }

  const streams = flattenLegacyCandidates(candidates)

  return { streams, candidates }
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
