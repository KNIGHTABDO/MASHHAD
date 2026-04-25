import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isAuthPage = url.pathname.startsWith('/login') || url.pathname.startsWith('/register')
  const isPublicPath = url.pathname.startsWith('/_next') || url.pathname.startsWith('/fonts') || url.pathname.includes('favicon')

  if (isPublicPath) return supabaseResponse

  if (!user && !isAuthPage) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    url.pathname = '/profiles'
    return NextResponse.redirect(url)
  }

  // Check if user has selected a profile
  const activeProfileId = request.cookies.get('active_profile_id')?.value
  const isProfilePage = url.pathname.startsWith('/profiles') || url.pathname.startsWith('/api/')
  
  if (user && !isAuthPage && !isProfilePage && !activeProfileId) {
    url.pathname = '/profiles'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
