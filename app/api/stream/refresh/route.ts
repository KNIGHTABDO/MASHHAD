import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RD_BASE = 'https://api.real-debrid.com/rest/1.0'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { torrentId, fileId, type } = body as {
    torrentId?: string
    fileId?: string
    link?: string
    type?: 'direct' | 'transcode'
  }
  const { link } = body as { link?: string }

  if (!torrentId || !fileId || !type) {
    return NextResponse.json({ error: 'Missing torrentId, fileId, or type' }, { status: 400 })
  }

  const token = process.env.REALDEBRID_API_TOKEN || process.env.RD_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Server misconfigured: no RD token' }, { status: 500 })
  }

  try {
    if (type === 'direct') {
      let videoLink = link
      if (!videoLink) {
        const infoRes = await fetch(`${RD_BASE}/torrents/info/${torrentId}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
        })
        if (!infoRes.ok) {
          return NextResponse.json({ error: 'Failed to fetch torrent info' }, { status: 502 })
        }
        const info = await infoRes.json()
        videoLink = info.links?.find((l: string) => /\.(mkv|mp4|avi|mov|m4v|webm)(\?|$)/i.test(l)) || info.links?.[0]
      }
      if (!videoLink) {
        return NextResponse.json({ error: 'No links found in torrent' }, { status: 404 })
      }

      const unrestrictRes = await fetch(`${RD_BASE}/unrestrict/link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `link=${encodeURIComponent(videoLink)}`,
        signal: AbortSignal.timeout(8000),
      })
      if (!unrestrictRes.ok) {
        return NextResponse.json({ error: 'Unrestrict failed' }, { status: 502 })
      }
      const data = await unrestrictRes.json()
      return NextResponse.json({ download: data.download, fileName: data.filename, id: data.id })
    }

    if (type === 'transcode') {
      const transcodeRes = await fetch(`${RD_BASE}/streaming/transcode/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      })
      if (!transcodeRes.ok) {
        return NextResponse.json({ error: 'Transcode refresh failed' }, { status: 502 })
      }
      const data = await transcodeRes.json()
      return NextResponse.json({
        apple: data.apple?.full || null,
        dash: data.dash?.full || null,
        liveMP4: data.liveMP4?.full || null,
        h264WebM: data.h264WebM?.full || null,
      })
    }

    return NextResponse.json({ error: 'Invalid refresh type' }, { status: 400 })
  } catch (err) {
    console.error('[Refresh]', err)
    return NextResponse.json({ error: 'Internal refresh error' }, { status: 500 })
  }
}
