// src/app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookies can only be set in Server Actions or Route Handlers
          }
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch from 'profiles' table with 'admin' role
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('email', session.user.email)
    .single();

  // Redirect if not admin
  if (!userProfile || userProfile.role !== 'admin') {
    redirect('/staff/dashboard'); 
  }

  return <>{children}</>;
}