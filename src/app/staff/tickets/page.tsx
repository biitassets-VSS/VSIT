import StaffTicketsClient from './StaffTicketsClient';

// import prisma from '@/lib/prisma'; // Your DB client

export default async function StaffTicketsPage() {
  // 1. FETCH REAL DATA FROM YOUR DATABASE HERE
  // You need both the user's previous tickets AND their assigned assets for the dropdown.
  
  /*
  const currentUser = await getCurrentUser();

  // Fetch their tickets
  const dbTickets = await prisma.ticket.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch their assigned assets (to populate the dropdown menu)
  const dbAssets = await prisma.asset.findMany({
    where: { assignedToId: currentUser.id },
    select: { id: true, name: true }
  });
  */

  // Empty arrays to prevent crashes until your DB is connected
  const realTickets: any[] = []; 
  const realAssets: any[] = [];

  return (
    <StaffTicketsClient 
      initialTickets={realTickets} 
      assignedAssets={realAssets} 
    />
  );
  {/* FLOATING COPYRIGHT AT BOTTOM RIGHT */}
      <div className="fixed bottom-4 right-6 z-50 pointer-events-none">
        <p className="text-[11px] font-medium text-gray-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
          Design by <span className="text-blue-600 font-bold tracking-wide">AinodeArt</span>
        </p>
      </div>
}