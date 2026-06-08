import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ✨ Changed function name from 'middleware' to 'proxy'
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // We are HARDCODING the keys here to bypass the environment variable error!
  const supabase = createServerClient(
    "https://ghsiojfheepygzhkrymv.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoc2lvamZoZWVweWd6aGtyeW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjA1NTMsImV4cCI6MjA5NjI5NjU1M30.L9hEtQ0PYnK0M4SzwbCC-YmMeiNxB6x3DD7b586gFQs",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  // This refreshes the session if needed
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
