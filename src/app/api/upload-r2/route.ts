import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(req: NextRequest) {
  try {
    const { image, assetId, angle } = await req.json();
    if (!image) return NextResponse.json({ error: 'Missing image data' }, { status: 400 });

    // Extract base64 image string data cleanly
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `inspections/${assetId}-${angle}-${Date.now()}.jpg`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: 'image/jpeg',
      })
    );

    // Build your permanent, non-expiring public URL link path
    const permanentPublicUrl = `${process.env.R2_PUBLIC_DOMAIN_URL}/${fileName}`;

    return NextResponse.json({ url: permanentPublicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}