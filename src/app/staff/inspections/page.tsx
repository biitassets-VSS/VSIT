// src/app/staff/inspections/page.tsx
import StaffInspectionsClient from './StaffInspectionsClient';

// Import your database client here
// import prisma from '@/lib/prisma'; 

export default async function StaffInspectionsPage() {
  // 1. FETCH LIVE DATA FROM YOUR DATABASE HERE
  // Example using Prisma:
  /*
  const currentUser = await getCurrentUser();
  const staffName = currentUser.name;

  const dbAssets = await prisma.asset.findMany({
    where: { assignedToId: currentUser.id }
  });

  const dbHistory = await prisma.inspectionRecord.findMany({
    where: { asset: { assignedToId: currentUser.id } },
    orderBy: { date: 'desc' }
  });
  */

  // Placeholders to prevent crashes until you connect your DB.
  // Replace these with your actual database variables.
  const liveStaffName = "Lakhwinder Singh"; // Replace with dynamically fetched user name
  const liveAssets: any[] = []; 
  const liveHistory: any[] = []; 

  // 2. PASS THE LIVE DATA TO THE UI
  return (
    <StaffInspectionsClient 
      initialAssets={liveAssets} 
      initialHistory={liveHistory}
      staffName={liveStaffName}
    />
  );
}