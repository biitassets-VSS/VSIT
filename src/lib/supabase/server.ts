import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    "https://ghsiojfheepygzhkrymv.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoc2lvamZoZWVweWd6aGtyeW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjA1NTMsImV4cCI6MjA5NjI5NjU1M30.L9hEtQ0PYnK0M4SzwbCC-YmMeiNxB6x3DD7b586gFQs",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
