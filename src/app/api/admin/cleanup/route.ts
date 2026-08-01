// src/app/api/admin/cleanup/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST() {
  try {
    // We use the Service Role Key here to bypass RLS for a global admin cleanup
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Delete Rejected & Demo Tickets (Returns / Replacements / Demos)
    await supabaseAdmin.from('tickets')
      .delete()
      .or('status.ilike.%reject%,status.ilike.%decline%,created_by.ilike.%guest%,created_by.ilike.%demo%');

    // 2. Delete Rejected / Failed Inspections
    await supabaseAdmin.from('inspections')
      .delete()
      .or('status.ilike.%reject%,status.ilike.%fail%');

    // 3. Clean up Assets (Reset rejected return statuses and clear notes)
    await supabaseAdmin.from('assets')
      .update({ 
        status: 'Assigned', 
        inspection_status: 'Approved',
        notes: null // Clears the clutter notes
      })
      .or('status.ilike.%reject%,inspection_status.ilike.%reject%');

    return NextResponse.json({ success: true, message: "Database scrubbed successfully!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}