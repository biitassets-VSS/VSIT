import QRCode from 'qrcode'

export async function generateAssetQR(assetTag: string): Promise<string> {
  try {
    // Generates a base64 encoded image string
    const url = await QRCode.toDataURL(`asset:${assetTag}`, {
      width: 300,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' }
    });
    return url;
  } catch (err) {
    console.error("QR Generation failed", err);
    return '';
  }
}
