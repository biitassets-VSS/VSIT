'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Search, CheckCircle2, UserCheck, Package } from 'lucide-react';

interface Asset {
  id: string; tagId: string; name: string; category: string; status: string;
  assignedToName?: string; assignedToEmpId?: string; lastInspection?: string;
}

export default function InspectionsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) setAssets(JSON.parse(savedAssets));
  }, []);

  const handleMarkInspected = (assetId: string) => {
    const today = new Date().toISOString().split('T')[0]; // Gets YYYY-MM-DD
    const updatedAssets = assets.map(a => 
      a.id === assetId ? { ...a, lastInspection: today } : a
    );
    
    setAssets(updatedAssets);
    localStorage.setItem('vsit_assets_inventory', JSON.stringify(updatedAssets));
    
    // 🚀 Update the Sidebar Notification Badge
    window.dispatchEvent(new Event('inventoryUpdated')); 
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.assignedToName && a.assignedToName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="text-blue-600" /> Asset Inspections
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Track physical condition and audit assigned inventory.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search Asset or Staff Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-black">
                <th className="p-4 pl-6">Asset Details</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Inspection Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                  
                  <td className="p-4 pl-6">
                    {/* 🔗 LINK TO ASSET */}
                    <Link href={`/admin/assets/${asset.id}`} className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1.5">
                      <Package size={14} className="text-blue-400"/> {asset.name}
                    </Link>
                    <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-1 inline-block">{asset.tagId}</span>
                  </td>

                  <td className="p-4">
                    {asset.status === 'Assigned' && asset.assignedToEmpId ? (
                      // 🔗 LINK TO STAFF
                      <Link href={`/admin/staff/${asset.assignedToEmpId}`} className="text-sm font-bold text-gray-700 hover:text-blue-600 hover:underline flex items-center gap-1.5">
                        <UserCheck size={14} className="text-gray-400"/> {asset.assignedToName}
                      </Link>
                    ) : (
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">In Office / Unassigned</span>
                    )}
                  </td>

                  <td className="p-4">
                    {asset.lastInspection === 'Pending' ? (
                      <span className="inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border bg-red-50 text-red-600 border-red-200">
                        Pending Audit
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-gray-600 flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-green-500"/> {asset.lastInspection}
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    {asset.lastInspection === 'Pending' && (
                      <button 
                        onClick={() => handleMarkInspected(asset.id)}
                        className="text-xs font-bold bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg transition-all shadow-sm"
                      >
                        Mark Inspected
                      </button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
