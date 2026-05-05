import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

const authDisabled = process.env.MASHHAD_DISABLE_AUTH === '1'

const isPublicPage = createRouteMatcher(['/landing(.*)', '/login(.*)', '/register(.*)'])
const isTrendingApi = createRouteMatcher(['/api/tmdb/trending(.*)'])

const middleware = authDisabled
  ? async () => NextResponse.next()
  : clerkMiddleware(async (auth, request: NextRequest) => {
      const { userId } = await auth()
      const { pathname } = request.nextUrl

      if (isTrendingApi(request)) {
        return NextResponse.next()
      }

      if (isPublicPage(request)) {
        if (userId) {
          const url = request.nextUrl.clone()
          url.pathname = '/profiles'
          return NextResponse.redirect(url)
        }
        return NextResponse.next()
      }

      if (!userId) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.next()
        }

        const url = request.nextUrl.clone()
        url.pathname = '/landing'
        return NextResponse.redirect(url)
      }

      const activeProfileId = request.cookies.get('active_profile_id')?.value
      const isProfilePage =
        pathname.startsWith('/profiles') || pathname.startsWith('/settings') || pathname.startsWith('/admin')

      if (!isProfilePage && !pathname.startsWith('/api/') && !activeProfileId) {
        const url = request.nextUrl.clone()
        url.pathname = '/profiles'
        return NextResponse.redirect(url)
      }

      return NextResponse.next()
    })

export default middleware

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov)$).*)',
  ],
}
