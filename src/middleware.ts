import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Note: 'edge' is the standard directive for modern Next.js. 
// Keep 'experimental-edge' only if OpenNext strictly crashes without it.
export const runtime = 'edge';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // It is safer to rely strictly on env variables to prevent accidental commits of fallback keys
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Fetch the user securely (this also automatically refreshes stale tokens)
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const path = url.pathname

  // Define your public, unprotected routes here
  const isPublicRoute = path === '/login' || path.startsWith('/api/') || path.startsWith('/public-asset')

  // 1. Redirect unauthenticated users trying to access protected routes
  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Redirect logged-in users away from the login page
  if (user && path === '/login') {
    // You can customize this to check the user's role via Supabase 
    // user metadata before deciding where to send them
    url.pathname = '/admin/dashboard' 
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}