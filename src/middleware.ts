import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// REQUIRED: Use 'experimental-edge' to satisfy Next.js 16 Turbopack AND OpenNext simultaneously
export const runtime = 'experimental-edge';

export default async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ghsiojfheepygzhkrymv.supabase.co";
  const supabaseKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoc2lvamZoZWVweWd6aGtyeW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjA1NTMsImV4cCI6MjA5NjI5NjU1M30.L9hEtQ0PYnK0M4SzwbCC-YmMeiNxB6x3DD7b586gFQs";

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

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}