import { NextResponse } from 'next/server'
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server'

// The admin email allowed to force upgrade
const ADMIN_EMAIL = 'knight007youtu@gmail.com'

export async function POST() {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = user.emailAddresses[0]?.emailAddress

  if (userEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
  }

  try {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        plan: 'lifetime',
        isPro: true
      }
    })

    return NextResponse.json({ success: true, message: 'Pro status activated manually!' })
  } catch (err: any) {
    console.error('[Admin Force Pro] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
