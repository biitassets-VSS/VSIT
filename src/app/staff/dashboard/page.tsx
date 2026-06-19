import StaffDashboardClient from './StaffDashboardClient';

// Import your database client here (e.g., Prisma, Drizzle, or Mongoose)
// import prisma from '@/lib/prisma'; 

export default async function StaffDashboardPage() {
  
  // 1. FETCH LIVE DATA FROM YOUR DATABASE
  // Uncomment and update this query to match your actual database logic.
  // Example using Prisma:
  /*
  const liveAssets = await prisma.asset.findMany({
    where: { 
      // Example: filter by the currently logged-in user
      // assignedToId: currentUser.id 
    },
    select: {
      id: true,
      name: true,
      tag: true,
      serial: true,
      category: true,
      department: true,
      status: true,
    }
  });
  */

  // Placeholder array to prevent crashes until you connect your DB above.
  // Replace this with your actual database variable (e.g., liveAssets).
  const databaseAssets: any[] = []; 

  // 2. PASS THE LIVE DATA TO THE UI
  return <StaffDashboardClient initialAssets={databaseAssets} />;
}