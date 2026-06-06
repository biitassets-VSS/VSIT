import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, subject, assetTag, daysLeft } = await req.json();

    const data = await resend.emails.send({
      from: 'IT Admin <it-assets@yourdomain.com>',
      to: email,
      subject: subject,
      html: `
        <h2>Inspection Due Alert</h2>
        <p>Your inspection for asset <strong>${assetTag}</strong> is due in ${daysLeft} days.</p>
        <p>Please log in to the Staff Dashboard to submit your weekly report.</p>
        <p><em>Virtual Staffing Solution - IT Assets Management System</em></p>
      `,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error });
  }
}
