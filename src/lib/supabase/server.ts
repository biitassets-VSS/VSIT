import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// @ts-ignore
import QRCode from 'qrcode'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function generateAssetQR(assetTag: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(assetTag)
    return qrCodeDataUrl
  } catch (err) {
    console.error('Error generating QR code', err)
    return ''
  }
}
