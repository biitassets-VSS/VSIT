import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Instruct Cloudflare Pages & Vercel to run this on the Edge runtime
export const runtime = 'edge';

export async function POST() {
  try {
    // Safe initialization inside the handler prevents build-time static evaluation crashes
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-key';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all emails from your custom 'staff' table
    const { data: staffList, error: fetchError } = await supabaseAdmin
      .from('staff')
      .select('email');

    if (fetchError) throw fetchError;
    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ message: 'No staff found in the database.' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errorsList: { email: string; error: string }[] = [];

    // 2. Loop through every staff member and create an Auth account
    for (const staff of staffList) {
      if (!staff.email) continue;

      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: staff.email,
        password: 'TemporaryPassword123!', // Default password for everyone
        email_confirm: true, // Auto-confirms email for instant login
      });

      if (error) {
        // Skip users that already exist
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
      errors: errorsList,
    });
  } catch (error: unknown) {
    // Type guard for TypeScript safety
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}