import React from 'react';
import { 
  Laptop, Monitor, CheckCircle2, AlertTriangle, 
  ShieldCheck, Calendar, Info, Smartphone, HelpCircle
} from 'lucide-react';
// import prisma from '@/lib/prisma'; // Example: Import your DB client here

// Helper function to map database string types to Lucide icons
const getIconForType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'laptop': return Laptop;
    case 'monitor': return Monitor;
    case 'phone': return Smartphone;
    default: return HelpCircle;
  }
};

export default async function StaffAssetsPage() {
  
  // 1. FETCH LIVE DATA FROM YOUR DATABASE
  // Example using Prisma: const dbAssets = await prisma.asset.findMany({ where: { userId: currentUser.id } });
  // Example using Fetch API: const res = await fetch('https://your-api.com/assets', { cache: 'no-store' });
  
  // For this example, we'll pretend this is the raw data returning from your DB:
  const dbAssets = [
    { 
      id: 'TAG-1045', 
      name: 'MacBook Pro 14" (M2)', 
      type: 'Laptop', 
      assignedDate: '2023-01-15',
      health: 'Good Condition',
      inspectionStatus: 'Passed',
      lastInspected: '2023-10-01',
      nextInspection: '2024-04-01'
    }
  ];

  // 2. MAP THE DB DATA TO YOUR UI EXPECTATIONS
  const myAssets = dbAssets.map(asset => ({
    ...asset,
    // Format dates if needed here, and attach the correct React Icon component
    icon: getIconForType(asset.type) 
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-black text-gray-900">My Assigned Assets</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">
          View the equipment assigned to you and their current inspection status.
        </p>
      </div>

      {/* ASSETS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {myAssets.map((asset) => {
          const Icon = asset.icon;
          const isInspectionDue = asset.inspectionStatus === 'Due Soon';

          return (
            <div key={asset.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              
              {/* ASSET HEADER */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-600">
                    <Icon size={32} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">{asset.name}</h2>
                    <p className="text-sm font-bold text-blue-600 mt-0.5">{asset.id}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{asset.type}</span>
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                        <Calendar size={12}/> Assigned: {asset.assignedDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* INSPECTION DETAILS */}
              <div className="p-6 bg-gray-50/50 flex-1 grid grid-cols-2 gap-4">
                
                <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Info size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Device Health</span>
                  </div>
                  <p className="text-sm font-black text-gray-900">{asset.health}</p>
                </div>

                <div className={`col-span-2 md:col-span-1 p-4 rounded-xl border ${isInspectionDue ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                  <div className={`flex items-center gap-2 mb-2 ${isInspectionDue ? 'text-orange-600' : 'text-green-600'}`}>
                    <ShieldCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Inspection Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isInspectionDue ? <AlertTriangle size={18} className="text-orange-600"/> : <CheckCircle2 size={18} className="text-green-600"/>}
                    <p className={`text-base font-black ${isInspectionDue ? 'text-orange-700' : 'text-green-700'}`}>
                      {asset.inspectionStatus}
                    </p>
                  </div>
                </div>

                <div className="col-span-2 flex justify-between items-center text-xs font-bold text-gray-500 bg-white p-3 rounded-xl border border-gray-100">
                  <span>Last Checked: {asset.lastInspected}</span>
                  <span className={isInspectionDue ? 'text-orange-600' : ''}>Next Due: {asset.nextInspection}</span>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}