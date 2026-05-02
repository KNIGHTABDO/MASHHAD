export type StreamVariantKind = 'direct' | 'liveMp4' | 'hls' | 'dash' | 'webm' | 'embed'

export type StreamCompatibility = 'universal' | 'desktop' | 'ios' | 'android' | 'fallback' | 'unknown'

export interface StreamResult {
  url: string
  quality?: string
  server: string
  type: 'hls' | 'mp4' | 'dash' | 'embed'
  isRealDebrid: boolean
  label?: string
  fileName?: string // The actual video filename for subtitle matching
  rdFileId?: string   // Real-Debrid unrestricted file ID (for /streaming/transcode refresh)
  rdTorrentId?: string // Real-Debrid torrent ID (for re-unrestrict)
  rdLink?: string // Original RD link for safe refresh of the exact selected file
  candidateId?: string
  variant?: StreamVariantKind
  rank?: number
  infoHash?: string
  fileIdx?: number
  fileSize?: number
  releaseTitle?: string
  videoCodec?: string
  audioCodec?: string
  container?: string
  originalLanguage?: string
  audioLanguages?: string[]
  audioTrackConfidence?: number
  audioTrackSource?: string
  isDubbed?: boolean
  dubPenalty?: number
  selectedAudioLanguage?: string
  compatibility?: StreamCompatibility
  verifiedMatch?: boolean
  score?: number
  seeders?: number
  rdCached?: boolean
}

export interface StreamVariant {
  url: string
  type: StreamResult['type']
  variant: StreamVariantKind
  label: string
  compatibility: StreamCompatibility
}

export interface StreamCandidate {
  id: string
  provider: string
  server: string
  isRealDebrid: boolean
  rank: number
  score: number
  quality?: string
  infoHash?: string
  fileIdx?: number
  fileSize?: number
  releaseTitle?: string
  fileName?: string
  videoCodec?: string
  audioCodec?: string
  container?: string
  originalLanguage?: string
  audioLanguages?: string[]
  audioTrackConfidence?: number
  audioTrackSource?: string
  isDubbed?: boolean
  dubPenalty?: number
  selectedAudioLanguage?: string
  seeders?: number
  rdCached?: boolean
  verifiedMatch: boolean
  rdFileId?: string
  rdTorrentId?: string
  rdLink?: string
  variants: StreamVariant[]
  metadata?: Record<string, unknown>
}

export interface StreamResolveResult {
  streams: StreamResult[]
  candidates: StreamCandidate[]
}

export interface ServerAdapter {
  name: string
  resolve(
    tmdbId: string,
    type: 'movie' | 'episode',
    season?: number,
    episode?: number
  ): Promise<StreamResult[]>
}
