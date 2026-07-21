import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// 1. Required for Cloudflare Pages & Vercel Edge Runtime
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // 2. Safe client initialization inside the handler prevents static evaluation build crashes
    const resend = new Resend(
      process.env.RESEND_API_KEY || 're_dummy_key_for_build'
    );

    const body = await req.json();
    const { email, subject, assetTag, daysLeft } = body;

    // Validate required fields before sending
    if (!email || !subject || !assetTag) {
      return NextResponse.json(
        { error: 'Missing required email parameters' },
        { status: 400 }
      );
    }

    // 3. Send the email via Resend
    const { data, error } = await resend.emails.send({
      from: 'IT Admin <it-assets@yourdomain.com>', // Ensure this domain is verified in your Resend dashboard
      to: email,
      subject: subject,
      html: `
        <h2>Inspection Due Alert</h2>
        <p>Your inspection for asset <strong>${assetTag}</strong> is due in ${daysLeft} days.</p>
        <p>Please log in to the Staff Dashboard to submit your weekly report.</p>
        <p><em>Virtual Staffing Solution - IT Assets Management System</em></p>
      `,
    });

    // Handle API errors returned directly by Resend
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    // Strict TypeScript error extraction
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}