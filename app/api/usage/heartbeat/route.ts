import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

interface ClerkMetadata {
  plan?: string;
  isPro?: boolean;
}

export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Safely check for Pro status in Clerk metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = (sessionClaims?.metadata || {}) as any
  const isPro = metadata?.plan === 'lifetime' || metadata?.isPro === true

  const { increment = 30 } = await request.json()
  
  const supabase = await createClient()

  // If Pro, we still track usage for analytics, but the limit won't apply on the frontend
  const { data, error } = await supabase.rpc('increment_user_usage', {
    increment_seconds: increment
  })

  if (error) {
    console.error('[Usage Heartbeat] Error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ 
    secondsWatchedToday: data, 
    isPro,
    limitReached: !isPro && data > 18000 // 5 hours
  })
}

export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = (sessionClaims?.metadata || {}) as any
  const isPro = metadata?.plan === 'lifetime' || metadata?.isPro === true
  
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_usage')
    .select('seconds_watched')
    .eq('user_id', userId)
    .eq('usage_date', new Date().toISOString().split('T')[0])
    .maybeSingle()

  const seconds = data?.seconds_watched || 0

  return NextResponse.json({ 
    secondsWatchedToday: seconds, 
    isPro,
    limitReached: !isPro && seconds > 18000
  })
}
