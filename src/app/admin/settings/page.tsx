// src/app/settings/page.tsx
import SettingsClient from './SettingsClient';

// ⚠️ IMPORT YOUR ACTUAL DATABASE CLIENT HERE
// Example: import prisma from '@/lib/prisma'; 

export default async function SettingsPage() {
  
  // 1. FETCH REAL SETTINGS
  // Replace with your actual DB call, or keep defaults if you don't store settings in the DB yet.
  const liveSettings = {
    appName: 'Asset Management Portal',
    supportEmail: 'admin@company.com',
    allowStaffLogin: true,
    allowStaffEditAssets: false,
    requireAdminApproval: true,
    compressUploads: true,
    maxUploadSizeMB: '5',
    enableWatermarks: true,
    watermarkFormat: 'Date & Time'
  };

  // 2. FETCH REAL USERS FROM YOUR DATABASE
  // ⚠️ UNCOMMENT AND UPDATE THIS BLOCK TO MATCH YOUR DATABASE
  /*
  const liveUsers = await prisma.user.findMany({
    select: { 
      id: true, 
      name: true, 
      email: true, 
      role: true // This should pull 'Staff', 'Admin', or 'Revoked'
    },
    orderBy: { name: 'asc' } // Sorts alphabetically by name
  });
  */

  // Fallback empty array to prevent crashes until you uncomment the block above.
  const liveUsers: any[] = []; 

  return <SettingsClient initialSettings={liveSettings} initialUsers={liveUsers} />;
}