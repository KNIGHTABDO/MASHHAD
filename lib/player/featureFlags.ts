export const FEATURE_HEVCJS = process.env.NEXT_PUBLIC_EXPERIMENTAL_HEVCJS === '1'
export const FEATURE_MEDIABUNNY_AC3 = process.env.NEXT_PUBLIC_EXPERIMENTAL_MEDIABUNNY_AC3 === '1'

export function getPlayerFeatureFlags() {
  return {
    hevcJs: FEATURE_HEVCJS,
    mediabunnyAc3: FEATURE_MEDIABUNNY_AC3,
  }
}

export function getMediaSupportSnapshot() {
  if (typeof window === 'undefined') {
    return {
      webCodecs: false,
      mediaCapabilities: false,
    }
  }

  return {
    webCodecs: 'VideoDecoder' in window && 'AudioDecoder' in window,
    mediaCapabilities: 'mediaCapabilities' in navigator,
  }
}
