import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypass RLS for backend cron jobs
)

export async function GET(request: Request) {
  // 1. Verify cron secret to prevent unauthorized execution
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Fetch all assigned assets
    const { data: assignments, error } = await supabase
      .from('asset_assignments')
      .select('asset_id, staff_id, assets(asset_tag, name), staff(email, name, profile_id)')
      .is('returned_date', null) // Only active assignments

    if (error) throw error

    let alertsCreated = 0

    // 3. Check last inspection date for each assignment
    for (const assignment of assignments || []) {
      const { data: lastInspection } = await supabase
        .from('inspections')
        .select('inspection_date')
        .eq('asset_id', assignment.asset_id)
        .order('inspection_date', { ascending: false })
        .limit(1)
        .single()

      // If no inspection exists, or last one was > 5 days ago (Weekly schedule)
      const daysSinceLast = lastInspection 
        ? Math.floor((new Date().getTime() - new Date(lastInspection.inspection_date).getTime()) / (1000 * 3600 * 24))
        : 7 // Default to overdue if never inspected

      if (daysSinceLast >= 5) {
        
        // Safely extract the data to bypass TypeScript strict mode
        const anyAssignment = assignment as any;
        const asset = Array.isArray(anyAssignment.assets) ? anyAssignment.assets[0] : anyAssignment.assets;
        const staff = Array.isArray(anyAssignment.staff) ? anyAssignment.staff[0] : anyAssignment.staff;

        // Create In-App Notification
        await supabase.from('notifications').insert([{
          title: 'Inspection Due',
          message: `Inspection for ${asset.asset_tag} (${asset.name}) is due.`,
          type: 'Warning',
          target_role: 'staff',
          target_user: staff.profile_id
        }])

        // Send Email via Resend
        await resend.emails.send({
          from: 'IT Admin <it-assets@yourdomain.com>',
          to: staff.email,
          subject: 'Action Required: Asset Inspection Due',
          html: `<p>Hi ${staff.name},</p><p>Your weekly inspection for <strong>${asset.name} (${asset.asset_tag})</strong> is due soon. Please log into the portal to complete it.</p>`
        })

        alertsCreated++
      }
    }

    return NextResponse.json({ success: true, alertsCreated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
