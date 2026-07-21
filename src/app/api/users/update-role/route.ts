import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. Required for Cloudflare Pages & Vercel Edge Runtime
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // 2. Initialize inside the handler with fallback strings
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-key';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: 'Missing userId or newRole' },
        { status: 400 }
      );
    }

    // 3. Execute your database update (adjust table/column names if yours differ)
    const { data, error } = await supabaseAdmin
      .from('staff') // or 'profiles' / 'users'
      .update({ role: newRole })
      .eq('profile_id', userId) // or 'id': userId
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}