export interface StreamResult {
  url: string
  quality?: string
  server: string
  type: 'hls' | 'mp4' | 'dash' | 'embed'
  isRealDebrid: boolean
  label?: string
  fileName?: string // The actual video filename for subtitle matching
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
