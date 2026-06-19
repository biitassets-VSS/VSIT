// src/app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import AdminLayoutClient from './AdminLayoutClient';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient({ cookies });

  // 1. Check if the user is logged in
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // 2. Fetch their role from your 'staff' table
  const { data: userProfile } = await supabase
    .from('staff')
    .select('role')
    .eq('email', session.user.email)
    .single();

  // 3. SECURITY RULE: If they are NOT an Admin, kick them to the Staff area
  if (!userProfile || userProfile.role !== 'Admin') {
    redirect('/staff/dashboard'); 
  }

  // 4. If they are an Admin, load your UI
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}