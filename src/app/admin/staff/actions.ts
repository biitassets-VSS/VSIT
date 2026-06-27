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
    // 🌟 FIX: Use the 'email' parameter directly, which is the supported API method
    const { data: searchData, error: searchError } = await supabaseAdmin.auth.admin.listUsers({
      email: cleanEmail
    });

    if (searchError) throw searchError;

    const existingUser = searchData?.users?.[0];

    if (existingUser) {
      // 2. User exists: Update their password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      );
      
      if (updateError) throw updateError;
      return { success: true, message: "User credentials updated successfully!" };

    } else {
      // 3. User does not exist: Create them
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });
      
      if (createError) throw createError;
      return { success: true, message: "Login access granted successfully!" };
    }
  } catch (error: any) {
    // Return a readable error message instead of an empty object
    const errorMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error)) || "Unknown Auth Error";
    console.error("Auth Admin Error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}