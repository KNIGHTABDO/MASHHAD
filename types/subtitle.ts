export interface Subtitle {
  id: string
  fileId: string
  fileName: string
  language: string
  downloadCount: number
  rating: number
  uploaderName: string
  url?: string
  communityScore?: number
  recommendedOffsetMs?: number
  syncScore?: number
  source?: string
  alignment?: SubtitleAlignment
}

export type SubtitleAlignmentType = 'global_offset' | 'linear_drift' | 'line_snap' | 'manual_marker'

export interface SubtitleAlignment {
  id: string
  type: SubtitleAlignmentType
  offsetMs: number
  driftRate?: number | null
  confidence?: number | null
}

export interface SubtitleVote {
  profile_id: string
  content_id: string
  subtitle_file_id: string
  vote: 1 | -1
}

export interface SubtitleSyncVote {
  profile_id: string
  subtitle_file_id: string
  offset_ms: number
}
