import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 🛡️ Robust Pro Check: Checks multiple paths in the JWT session claims
  // This handles different Clerk JWT template configurations
  const claims = sessionClaims as any
  const isPro = 
    claims?.metadata?.plan === 'lifetime' || 
    claims?.metadata?.isPro === true ||
    claims?.plan === 'lifetime' ||
    claims?.isPro === true ||
    claims?.publicMetadata?.plan === 'lifetime';

  const { increment = 30 } = await request.json()
  
  const supabase = await createClient()

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
    limitReached: !isPro && data > 18000
  })
}

export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const claims = sessionClaims as any
  const isPro = 
    claims?.metadata?.plan === 'lifetime' || 
    claims?.metadata?.isPro === true ||
    claims?.plan === 'lifetime' ||
    claims?.isPro === true ||
    claims?.publicMetadata?.plan === 'lifetime';
  
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
