'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Package, UserCheck, Calendar, ClipboardCheck, 
  Settings2, Image as ImageIcon, FileText 
} from 'lucide-react';

export default function AssetDetailsPage() {
  const params = useParams();
  const assetId = params.id as string;

  // MOCK DATA: In a real app, you would fetch this from Supabase using the assetId
  const asset = {
    id: assetId,
    tagId: 'TAG-1045',
    serialNumber: 'SN-MAC-001',
    name: 'MacBook Pro 14"',
    category: 'Laptops',
    status: 'Assigned',
    assignedToName: 'Lakhwinder Singh',
    assignedToEmpId: 'EMP-001', // We use this to link to staff!
    purchaseDate: '2022-06-15',
    warrantyExpiry: '2025-06-15',
  };

  const inspections = [
    { id: 'INS-991', date: 'Oct 20, 2023', status: 'Completed', notes: 'Screen and keyboard clean. No dents. Working perfectly.', inspector: 'Lakhwinder Singh' },
    { id: 'INS-882', date: 'Sep 15, 2023', status: 'Completed', notes: 'Minor scratch on bottom case. Logged.', inspector: 'Admin' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER & BACK BUTTON */}
      <div className="flex items-center gap-4">
        <Link href="/admin/assets" className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            {asset.name}
          </h1>
          <p className="text-sm font-mono text-gray-500 mt-1">{asset.tagId} | S/N: {asset.serialNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: ASSET INFO */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
              <Settings2 size={16} className="text-blue-500"/> Asset Details
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Category</p>
                <p className="font-semibold text-gray-900">{asset.category}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Current Status</p>
                <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mt-1">
                  {asset.status}
                </span>
              </div>
              {/* HYPERLINK TO STAFF PROFILE */}
              {asset.status === 'Assigned' && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-400 uppercase mb-1">Assigned To</p>
                  <Link href={`/admin/staff/${asset.assignedToEmpId}`} className="flex items-center gap-2 group">
                    <div className="h-8 w-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {asset.assignedToName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-blue-900 group-hover:underline">{asset.assignedToName}</p>
                      <p className="text-[10px] font-mono text-blue-600">{asset.assignedToEmpId}</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: INSPECTION HISTORY */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <ClipboardCheck size={18} className="text-green-500"/> Inspection Timeline
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {inspections.map((ins, idx) => (
                <div key={idx} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div className="h-4 w-4 rounded-full bg-green-500 ring-4 ring-green-100 z-10"></div>
                    {idx !== inspections.length - 1 && <div className="w-0.5 h-full bg-gray-200 absolute top-4 left-[7px]"></div>}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-gray-900">{ins.date}</p>
                      <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">By {ins.inspector}</span>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {ins.notes}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <div className="h-12 w-16 bg-gray-200 rounded-lg border border-gray-300 flex items-center justify-center"><ImageIcon size={16} className="text-gray-400"/></div>
                      <div className="h-12 w-16 bg-gray-200 rounded-lg border border-gray-300 flex items-center justify-center"><ImageIcon size={16} className="text-gray-400"/></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
