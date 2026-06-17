'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserCheck, Package, Hash, Mail, Phone, CalendarDays, Power } from 'lucide-react';

// Updated interface to match the new Staff Data
interface Staff { 
  empId: string; 
  name: string; 
  department: string; 
  isActive: boolean;
  email?: string;
  phone?: string;
  dob?: string;
  joiningDate?: string;
}
interface Asset { id: string; name: string; tagId: string; category?: string; assignedToEmpId?: string; }

export default function StaffProfilePage() {
  const params = useParams();
  const empId = params.id as string;
  
  const [staff, setStaff] = useState<Staff | null>(null);
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Get the staff member from the updated Local Storage list
    const savedStaff = localStorage.getItem('vsit_staff_users');
    if (savedStaff) {
      const allStaff: Staff[] = JSON.parse(savedStaff);
      const foundStaff = allStaff.find(s => s.empId === empId);
      setStaff(foundStaff || null);
    }

    // 2. Get their assigned assets
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) {
      const allAssets: Asset[] = JSON.parse(savedAssets);
      setAssignedAssets(allAssets.filter(a => a.assignedToEmpId === empId));
    }
    
    setIsLoading(false);
  }, [empId]);

  if (isLoading) return <div className="p-10 flex justify-center text-gray-400 animate-pulse">Loading Profile...</div>;
  if (!staff) return <div className="p-10 text-center font-bold text-red-500 bg-red-50 rounded-2xl border border-red-100 max-w-lg mx-auto mt-10">Staff member not found. Please ensure they exist in the Staff & Users list.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-4xl mx-auto">
      
      {/* Back Button */}
      <Link href="/admin/staff" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors w-fit">
        <ArrowLeft size={16} /> Back to Staff List
      </Link>

      {/* Staff Profile Header */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">
            <UserCheck size={36} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{staff.name}</h1>
            <p className="text-sm font-bold text-gray-500 mt-1">{staff.department} • {staff.empId}</p>
            
            {/* Account Status Badge */}
            <div className="mt-3">
              <span className={`px-3 py-1 text-[11px] font-black rounded-lg uppercase tracking-wide inline-flex items-center gap-1.5 ${
                staff.isActive ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                <Power size={12} /> {staff.isActive ? 'Login Active' : 'Login Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 w-full md:w-auto min-w-[250px] space-y-3">
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
            <Mail size={16} className="text-gray-400"/> {staff.email || 'No email provided'}
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
            <Phone size={16} className="text-gray-400"/> {staff.phone || 'No phone provided'}
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
            <CalendarDays size={16} className="text-gray-400"/> Joined: {staff.joiningDate || 'N/A'}
          </div>
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
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedAssets.map(asset => (
              <li key={asset.id} className="p-5 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors flex flex-col gap-3">
                
                {/* 🔗 Clickable Link to the Asset */}
                <Link href={`/admin/assets/${asset.id}`} className="font-black text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 text-base w-fit">
                  {asset.name}
                </Link>
                
                {/* Badges for Tag ID and Category */}
                <div className="flex gap-2">
                  <span className="text-[11px] font-mono bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <Hash size={12} className="text-gray-400"/> {asset.tagId}
                  </span>
                  {asset.category && (
                    <span className="text-[11px] font-bold bg-white border border-gray-200 text-gray-500 px-2.5 py-1 rounded-lg shadow-sm">
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
