import { describe, expect, it } from 'vitest'
import { formatDuration, formatRuntime, getTMDBImageUrl } from '@/lib/utils/format'

describe('format helpers', () => {
  it('formats runtime in English', () => {
    expect(formatRuntime(59, 'en')).toBe('59 min')
    expect(formatRuntime(60, 'en')).toBe('1 hr')
    expect(formatRuntime(61, 'en')).toBe('1h 1m')
  })

  it('formats duration as mm:ss and hh:mm:ss', () => {
    expect(formatDuration(9)).toBe('0:09')
    expect(formatDuration(70)).toBe('1:10')
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('builds TMDB image URLs consistently', () => {
    expect(getTMDBImageUrl(null)).toBe('/placeholder-poster.jpg')
    expect(getTMDBImageUrl('https://example.com/x.jpg')).toBe('https://example.com/x.jpg')
    expect(getTMDBImageUrl('/abc.jpg', 'w300')).toBe('https://image.tmdb.org/t/p/w300/abc.jpg')
  })
})
