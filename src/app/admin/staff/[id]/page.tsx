'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserCheck, Package, Hash } from 'lucide-react';

interface Staff { empId: string; name: string; department: string; }
interface Asset { id: string; name: string; tagId: string; serialNumber: string; category: string; assignedToEmpId?: string; }

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

  useEffect(() => {
    const foundStaff = mockStaff.find(s => s.empId === empId);
    setStaff(foundStaff || null);

    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) {
      const allAssets: Asset[] = JSON.parse(savedAssets);
      setAssignedAssets(allAssets.filter(a => a.assignedToEmpId === empId));
    }
  }, [empId]);

  if (!staff) return <div className="p-10 text-center font-bold text-red-500">Staff member not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-4xl mx-auto">
      <Link href="/admin/staff" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={16} /> Back to Staff List
      </Link>

      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden p-8 flex items-center gap-4">
        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <UserCheck size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">{staff.name}</h1>
          <p className="text-sm font-bold text-gray-500 mt-1">{staff.department} • {staff.empId}</p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden p-8">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
          <Package size={16} className="text-blue-500"/> Assets Currently Assigned to {staff.name}
        </h3>

        {assignedAssets.length === 0 ? (
          <p className="text-gray-400 font-medium text-sm">This employee has no assets assigned right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assignedAssets.map(asset => (
              <div key={asset.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex justify-between items-center hover:border-blue-200 transition-colors">
                <div>
                  {/* 🔗 LINK TO ASSET DETAILS */}
                  <Link href={`/admin/assets/${asset.id}`} className="font-bold text-blue-600 hover:underline text-base">
                    {asset.name}
                  </Link>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] font-mono bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1"><Hash size={10}/> {asset.tagId}</span>
                    <span className="text-[10px] font-bold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded">{asset.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
