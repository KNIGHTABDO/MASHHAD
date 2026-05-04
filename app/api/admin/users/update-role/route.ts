import { NextResponse } from 'next/server'
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server'

const ADMIN_EMAIL = 'knight007youtu@gmail.com'

export async function POST(req: Request) {
  const { userId: adminId } = await auth()
  const adminUser = await currentUser()

  if (!adminId || !adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminEmail = adminUser.emailAddresses[0]?.emailAddress
  if (adminEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { userId, action } = await req.json()
    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const clerk = await clerkClient()
    
    if (action === 'upgrade') {
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          isPro: true,
          plan: 'lifetime'
        }
      })
    } else if (action === 'downgrade') {
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          isPro: false,
          plan: 'free'
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
