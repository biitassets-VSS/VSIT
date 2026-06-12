'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Download, Building2, Mail, Calendar, Package, CheckCircle2 
} from 'lucide-react';

export default function StaffDetailsPage() {
  const params = useParams();
  const empId = params.id as string; // Will grab EMP-001 from URL

  // MOCK DATA
  const staff = {
    empId: empId,
    name: 'Lakhwinder Singh',
    department: 'IT Department',
    role: 'Staff',
    email: 'lakhwinder@company.com',
    joiningDate: '2021-03-01',
    status: 'Active'
  };

  const assignedAssets = [
    { id: '1', tagId: 'TAG-1045', name: 'MacBook Pro 14"', category: 'Laptops', lastInspection: 'Oct 20, 2023' },
    { id: '3', tagId: 'TAG-3011', name: 'Logitech MX Master 3', category: 'Mouse', lastInspection: 'Oct 10, 2023' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/admin/staff" className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Staff Profile</h1>
          </div>
        </div>
        {/* ASSET PDF DOWNLOAD BUTTON */}
        <button className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl shadow-md transition-all font-bold text-sm">
          <Download size={18} /> Asset Report PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: STAFF INFO CARD */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="h-24 w-24 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-3xl mx-auto mb-4 ring-4 ring-white shadow-md">
              {staff.name.charAt(0)}
            </div>
            <h2 className="text-xl font-black text-gray-900">{staff.name}</h2>
            <p className="text-sm font-mono text-gray-500 mt-1 mb-4">{staff.empId}</p>
            
            <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 mb-6">
              <CheckCircle2 size={12} className="inline mr-1"/> {staff.status}
            </span>

            <div className="space-y-3 text-left">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                <Building2 size={18} className="text-gray-400"/>
                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Department</p><p className="font-bold text-gray-800 text-sm">{staff.department}</p></div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                <Mail size={18} className="text-gray-400"/>
                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Email</p><p className="font-bold text-gray-800 text-sm">{staff.email}</p></div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                <Calendar size={18} className="text-gray-400"/>
                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Joining Date</p><p className="font-bold text-gray-800 text-sm">{staff.joiningDate}</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: ASSIGNED ASSETS TABLE */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Package size={18} className="text-blue-500"/> Currently Assigned Equipment
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {assignedAssets.map((asset) => (
                // HYPERLINK TO ASSET PROFILE
                <Link key={asset.id} href={`/admin/assets/${asset.id}`} className="p-4 flex justify-between items-center hover:bg-blue-50 transition-colors group block">
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-blue-700">{asset.name}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{asset.tagId}</span>
                      <span className="text-[10px] font-bold text-gray-500">{asset.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Last Inspected</p>
                    <p className="text-sm font-bold text-gray-700">{asset.lastInspection}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
