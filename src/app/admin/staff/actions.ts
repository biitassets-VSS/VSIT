'use server';

import { createClient } from '@supabase/supabase-js';

// We use the service_role key to act as an Admin and bypass standard login rules
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function setupStaffAuth(email: string, password?: string, fullName?: string) {
  if (!password) return { success: true }; // Nothing to do if the password field is empty

  const cleanEmail = email.toLowerCase().trim();

  try {
    // 1. Fetch all users from the hidden Auth system to see if they already exist
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingAuthUser = users.find(u => u.email === cleanEmail);

    if (existingAuthUser) {
      // 2. User exists: Force update their password to what the admin typed
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        { password: password }
      );
      if (updateError) throw updateError;
      return { success: true, message: "Password overwritten successfully!" };

    } else {
      // 3. User does not exist: Create their official login credentials
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true, // Auto-confirm so they can log in instantly without checking email
        user_metadata: { full_name: fullName }
      });
      if (createError) throw createError;
      return { success: true, message: "Login access granted successfully!" };
    }
  } catch (error: any) {
    console.error("Auth Admin Error:", error);
    return { success: false, error: error.message };
  }
}