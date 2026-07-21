import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// 1. Required for Cloudflare Workers / Pages Edge Runtime
export const runtime = 'edge';

// 2. Exporting as 'default' named 'middleware' satisfies Turbopack, OpenNext, and ESBuild
export default async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 3. Use process.env first, falling back to your hardcoded strings for build-time safety
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

  // 4. Refreshes the Supabase Auth session if expired
  await supabase.auth.getUser()

  return response
}

// Alias export to satisfy Next.js 16's proxy convention simultaneously
export { middleware as proxy };

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}