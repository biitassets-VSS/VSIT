import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 1. Get the current user session
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname;

  // 2. If NO user is logged in, protect the admin and staff routes
  if (!user && (path.startsWith('/admin') || path.startsWith('/staff'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. If a user IS logged in, enforce strict role routing
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    
    // Bulletproof role formatting
    const role = profile?.role?.toLowerCase().trim();

    // Rule A: If Staff tries to access Admin
    if (role === 'staff' && path.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/staff/dashboard', request.url))
    }

    // Rule B: If Admin tries to access Staff
    if (role === 'admin' && path.startsWith('/staff')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    // Rule C: If already logged in and visiting the Login or Home page
    if (path === '/login' || path === '/') {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } else if (role === 'staff') {
        return NextResponse.redirect(new URL('/staff/dashboard', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
