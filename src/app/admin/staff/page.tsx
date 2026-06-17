'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, Package, UserCheck } from 'lucide-react';

interface Staff { empId: string; name: string; department: string; }
interface Asset { id: string; name: string; tagId: string; assignedToEmpId?: string; }

const mockStaff: Staff[] = [
  { empId: 'EMP-001', name: 'Lakhwinder Singh', department: 'IT Department' },
  { empId: 'EMP-002', name: 'Sarah Connor', department: 'Migrations' },
  { empId: 'EMP-003', name: 'John Doe', department: 'Accounts' },
  { empId: 'EMP-004', name: 'Jane Smith', department: 'Edu Calling' },
];

export default function StaffPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) setAssets(JSON.parse(savedAssets));
  }, []);

  const filteredStaff = mockStaff.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.empId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" /> Staff & Users
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage employees and view their assigned assets.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search Staff Name or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-black">
                <th className="p-4 pl-6">Staff Member</th>
                <th className="p-4">Department</th>
                <th className="p-4">Assigned Assets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map((staff) => {
                // Find assets assigned to this specific staff member
                const assignedAssets = assets.filter(a => a.assignedToEmpId === staff.empId);
                
                return (
                  <tr key={staff.empId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      {/* 🔗 LINK TO STAFF PROFILE */}
                      <Link href={`/admin/staff/${staff.empId}`} className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block flex items-center gap-2">
                        <UserCheck size={16} className="text-blue-400" /> {staff.name}
                      </Link>
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-1 inline-block">{staff.empId}</span>
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-600">{staff.department}</td>
                    <td className="p-4">
                      {assignedAssets.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {assignedAssets.map(asset => (
                            // 🔗 LINK TO ASSET DETAILS
                            <Link key={asset.id} href={`/admin/assets/${asset.id}`} className="text-xs font-bold text-gray-700 hover:text-blue-600 hover:underline flex items-center gap-1">
                              <Package size={12} className="text-gray-400"/> {asset.name} ({asset.tagId})
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">No assets assigned</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
