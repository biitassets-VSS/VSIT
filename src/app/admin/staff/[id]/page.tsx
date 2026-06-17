'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserCheck, Package, Hash } from 'lucide-react';

interface Staff { empId: string; name: string; department: string; }
interface Asset { id: string; name: string; tagId: string; category?: string; assignedToEmpId?: string; }

// Your same mock staff list
const mockStaff: Staff[] = [
  { empId: 'EMP-001', name: 'Lakhwinder Singh', department: 'IT Department' },
  { empId: 'EMP-002', name: 'Sarah Connor', department: 'Migrations' },
  { empId: 'EMP-003', name: 'John Doe', department: 'Accounts' },
  { empId: 'EMP-004', name: 'Jane Smith', department: 'Edu Calling' },
];

export default function StaffProfilePage() {
  const params = useParams();
  const empId = params.id as string;
  
  const [staff, setStaff] = useState<Staff | null>(null);
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Find the specific staff member
    const foundStaff = mockStaff.find(s => s.empId === empId);
    setStaff(foundStaff || null);

    // Get their assigned assets
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) {
      const allAssets: Asset[] = JSON.parse(savedAssets);
      setAssignedAssets(allAssets.filter(a => a.assignedToEmpId === empId));
    }
    
    setIsLoading(false);
  }, [empId]);

  if (isLoading) return <div className="p-10 flex justify-center text-gray-400 animate-pulse">Loading Profile...</div>;
  if (!staff) return <div className="p-10 text-center font-bold text-red-500">Staff member not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-3xl mx-auto">
      
      {/* Back Button */}
      <Link href="/admin/staff" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors w-fit">
        <ArrowLeft size={16} /> Back to Staff List
      </Link>

      {/* Staff Profile Header */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 flex items-center gap-5">
        <div className="h-16 w-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <UserCheck size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">{staff.name}</h1>
          <p className="text-sm font-bold text-gray-500 mt-1">{staff.department} • {staff.empId}</p>
        </div>
      </div>

      {/* Assigned Assets Section */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-6 border-b border-gray-100 pb-4 flex items-center gap-2">
          <Package size={18} className="text-blue-500"/> Assigned Assets
        </h3>
        
        {assignedAssets.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
            <p className="text-gray-500 text-sm font-bold">No assets currently assigned to this employee.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {assignedAssets.map(asset => (
              <li key={asset.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors flex flex-col gap-2">
                
                {/* 🔗 Clickable Link to the Asset */}
                <Link href={`/admin/assets/${asset.id}`} className="font-black text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 text-base w-fit">
                  {asset.name}
                </Link>
                
                {/* Badges for Tag ID and Category */}
                <div className="flex gap-2">
                  <span className="text-[10px] font-mono bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                    <Hash size={10} className="text-gray-400"/> {asset.tagId}
                  </span>
                  {asset.category && (
                    <span className="text-[10px] font-bold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded shadow-sm">
                      {asset.category}
                    </span>
                  )}
                </div>

              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
