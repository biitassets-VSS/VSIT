// src/app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient({ cookies });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch from 'profiles' table using lowercase role
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