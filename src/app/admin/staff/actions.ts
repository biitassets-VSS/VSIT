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
    // 1. Fetch user list from auth locker cleanly
    const { data: searchData, error: searchError } = await supabaseAdmin.auth.admin.listUsers();

    if (searchError) throw searchError;

    // Manually scan the array to find the EXACT matching email account
    const existingUser = searchData?.users?.find(
      (u: any) => u.email?.toLowerCase().trim() === cleanEmail
    );

    if (existingUser) {
      // 2. User exists in Auth Locker: Update their password safely
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      );
      
      if (updateError) throw updateError;

      // Ensure a matching row exists in the profiles table for this existing user
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: existingUser.id,
        email: cleanEmail,
        full_name: fullName || existingUser.user_metadata?.full_name || cleanEmail.split('@')[0]
      }, { onConflict: 'email' });

      if (profileError) console.error("Profile sync warning for existing user:", profileError.message);

      return { success: true, message: "User credentials and database profile updated successfully!" };

    } else {
      // 3. User does not exist: Create a brand new profile in Auth Locker
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });
      
      if (createError) throw createError;

      // Auto-create their linked identity inside your public 'profiles' table instantly!
      if (newUser?.user) {
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
          id: newUser.user.id, 
          email: cleanEmail,
          full_name: fullName || cleanEmail.split('@')[0],
          emp_code: 'STAFF-' + Math.floor(1000 + Math.random() * 9000)
        }, { onConflict: 'email' });

        if (profileError) {
          console.error("Auth layer built successfully, but relational profile row failed:", profileError.message);
        }
      }

      return { success: true, message: "Login access granted and database profile initialized successfully!" };
    }
  } catch (error: any) {
    // 🚨 FIXED: Extract real error properties directly so it never prints an empty {}
    let errorMessage = "Unknown Auth Error";
    
    if (error) {
      if (error.message) errorMessage = error.message;
      else if (error.error_description) errorMessage = error.error_description;
      else if (typeof error === 'string') errorMessage = error;
      else errorMessage = JSON.stringify(error);
    }
    
    console.error("Auth Admin Error:", errorMessage, error);
    return { success: false, error: errorMessage };
  }
}