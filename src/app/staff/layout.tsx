// src/app/staff/layout.tsx
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import StaffLayoutClient from './StaffLayoutClient';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient({ cookies });

  // 1. Check if logged in securely via Supabase Auth
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // 2. Fetch the user's specific profile from your 'staff' table
  const { data: userProfile } = await supabase
    .from('staff') // Ensure this is exactly your table name
    .select('name, emp_code, email, role')
    .eq('email', session.user.email)
    .single();

  // 3. SECURITY RULE: If they are NOT 'Staff', kick them out!
  if (!userProfile || userProfile.role !== 'Staff') {
    if (userProfile?.role === 'Admin') {
      redirect('/admin'); // Send Admins to the Admin dashboard
    } else {
      redirect('/login'); // Kick revoked/unknown users to login
    }
  }

  // 4. Calculate Initials for the UI Avatar
  const fullName = userProfile.name || 'Staff Member';
  const nameParts = fullName.trim().split(' ');
  let initials = 'SM';
  if (nameParts.length > 1 && nameParts[0] && nameParts[nameParts.length - 1]) {
    initials = nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0);
  } else if (fullName.length > 1) {
    initials = fullName.substring(0, 2);
  }

  // 5. Package the data to send to the Client UI
  const staffUser = {
    name: fullName,
    empCode: userProfile.emp_code || 'N/A',
    initials: initials.toUpperCase(),
    email: session.user.email
  };

  return <StaffLayoutClient staffUser={staffUser}>{children}</StaffLayoutClient>;
}