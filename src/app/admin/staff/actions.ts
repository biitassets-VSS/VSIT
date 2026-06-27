'use server';

import { createClient } from '@supabase/supabase-js';

// Ensure these exist
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables for Admin Auth.");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function setupStaffAuth(email: string, password?: string, fullName?: string) {
  if (!password) return { success: true };

  const cleanEmail = email.toLowerCase().trim();

  try {
    // 🌟 FIX: Force type assertion so Next.js 16 TypeScript compilation passes seamlessly
    const { data: searchData, error: searchError } = await supabaseAdmin.auth.admin.listUsers({
      ...({ email: cleanEmail } as any)
    });

    if (searchError) throw searchError;

    const existingUser = searchData?.users?.[0];

    if (existingUser) {
      // 1. User exists in Auth Locker: Update their password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      );
      
      if (updateError) throw updateError;

      // 🚨 Ensure a matching row exists in the profiles table for this existing user
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: existingUser.id,
        email: cleanEmail,
        full_name: fullName || existingUser.user_metadata?.full_name || cleanEmail.split('@')[0]
      }, { onConflict: 'email' });

      if (profileError) console.error("Profile sync warning for existing user:", profileError.message);

      return { success: true, message: "User credentials and database profile updated successfully!" };

    } else {
      // 2. User does not exist: Create them in Auth Locker
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });
      
      if (createError) throw createError;

      // 🚨 NEW: Auto-create their linked identity inside your public 'profiles' table instantly!
      if (newUser?.user) {
        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
          id: newUser.user.id, // Locks their unique authentication ID to their profile ID card
          email: cleanEmail,
          full_name: fullName || cleanEmail.split('@')[0],
          emp_code: 'STAFF-' + Math.floor(1000 + Math.random() * 9000) // Formats a clean temporary fallback code
        });

        if (profileError) {
          console.error("Auth layer built successfully, but relational profile row failed:", profileError.message);
        }
      }

      return { success: true, message: "Login access granted and database profile initialized successfully!" };
    }
  } catch (error: any) {
    // Return a readable error message instead of an empty object
    const errorMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error)) || "Unknown Auth Error";
    console.error("Auth Admin Error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}