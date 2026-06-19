// src/app/settings/page.tsx
import SettingsClient from './SettingsClient';

// ⚠️ IMPORTANT: Import your actual database client here!
// import prisma from '@/lib/prisma'; 

export default async function SettingsPage() {
  
  // =====================================================================
  // STEP 1: FETCH REAL DATA FROM YOUR DATABASE
  // Uncomment the code below and ensure it matches your database schema.
  // =====================================================================
  
  /*
  // Fetch real settings from DB (or use defaults if none exist)
  const dbSettings = await prisma.systemSettings.findFirst() || {
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

  // Fetch real users from DB
  const dbUsers = await prisma.user.findMany({
    select: { 
      id: true, 
      name: true, 
      email: true, 
      role: true 
    },
    orderBy: { name: 'asc' }
  });
  */

  // ⚠️ UNTIL YOU UNCOMMENT THE DB QUERY ABOVE, THIS WILL BE EMPTY
  // Once your DB is connected, replace these empty arrays with dbSettings & dbUsers
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
  
  const liveUsers: any[] = []; // <-- Replace with `dbUsers` once your DB is connected

  // STEP 2: PASS LIVE DATA TO UI
  return <SettingsClient initialSettings={liveSettings} initialUsers={liveUsers} />;
}