import { NextResponse } from 'next/server'
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server'

const ADMIN_EMAIL = 'knight007youtu@gmail.com'

export async function GET(req: Request) {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = user.emailAddresses[0]?.emailAddress
  if (userEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || ''

  try {
    const clerk = await clerkClient()
    const users = await clerk.users.getUserList({
      query,
      limit: 50,
    })

    const data = users.data.map(u => {
      const metadata = u.publicMetadata as { isPro?: boolean; plan?: string }
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.emailAddresses[0]?.emailAddress,
        isPro: metadata?.isPro === true,
        plan: metadata?.plan || 'free',
        createdAt: u.createdAt
      }
    })

    return NextResponse.json({ users: data })
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
