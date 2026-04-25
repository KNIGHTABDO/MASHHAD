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
