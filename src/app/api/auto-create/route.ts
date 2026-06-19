// src/app/api/staff/auto-create/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with the ADMIN key to bypass security
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // 1. Fetch all emails from your custom 'staff' table
    const { data: staffList, error: fetchError } = await supabaseAdmin
      .from('staff')
      .select('email');

    if (fetchError) throw fetchError;
    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ message: "No staff found in the database." });
    }

    let successCount = 0;
    let errorCount = 0;
    const errorsList = [];

    // 2. Loop through every staff member and create an Auth account
    for (const staff of staffList) {
      if (!staff.email) continue;

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: staff.email,
        password: 'TemporaryPassword123!', // The default password for everyone
        email_confirm: true, // Auto-confirms their email so they can log in instantly
      });

      if (error) {
        // If the error is that the user already exists, that's fine, we just skip them.
        if (error.message.includes('already been registered')) {
          continue;
        }
        errorCount++;
        errorsList.push({ email: staff.email, error: error.message });
      } else {
        successCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully created ${successCount} new accounts.`,
      errors: errorsList
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}