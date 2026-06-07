import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Safely handle Next.js 15+ async cookies without breaking synchronous Server Components
          return (async () => {
            const cookieStore = await cookies()
            return cookieStore.get(name)?.value
          })() as any
        },
        set(name: string, value: string, options: CookieOptions) {
          (async () => {
            try {
              const cookieStore = await cookies()
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Ignore errors when setting cookies inside Server Components
            }
          })()
        },
        remove(name: string, options: CookieOptions) {
          (async () => {
            try {
              const cookieStore = await cookies()
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Ignore errors when removing cookies inside Server Components
            }
          })()
        },
      },
    }
  )
}
