'use client';

import React, { useState, useEffect } from 'react';
import { PackageSearch, Plus, UploadCloud, Search, Printer, CheckCircle2, User, Wrench, ArrowLeft, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface Asset {
  id: string; tagId: string; name: string; category: string;
  status: 'In Stock (Available)' | 'Assigned' | 'Maintenance' | 'Retired';
  assignedTo?: string; photos?: string[];
  inspection_status?: string; last_inspection_date?: string; notes?: string;
}

export default function AdminAssetsPage() {
  const [viewState, setViewState] = useState<'list' | 'view_details'>('list');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      const { data } = await supabase.from('assets').select('*');
      if (data) {
        setAssets(data.map((d: any) => ({
          ...d, tagId: d.tag_id, assignedTo: d.assigned_to,
          inspection_status: d.inspection_status || 'Pending',
          last_inspection_date: d.last_inspection_date || 'N/A'
        })));
      }
      setIsLoaded(true);
    };
    fetchAssets();
  }, []);

  if (!isLoaded) return <div className="p-10 text-center font-bold">Loading...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {viewState === 'list' && (
        <>
          {/* Header Bar */}
          <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><PackageSearch className="text-[#008b74]" /> Asset Inventory</h1>
              <p className="text-sm font-medium text-gray-500">Manage, track, and upload company hardware.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 bg-gray-100 px-4 py-2.5 rounded-xl font-bold text-sm"><Printer size={18} /> Print Tags</button>
              <button className="flex items-center gap-2 bg-white border px-4 py-2.5 rounded-xl font-bold text-sm"><UploadCloud size={18} /> Bulk Upload</button>
              <button className="bg-[#008b74] text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"><Plus size={18} /> Add Asset</button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            {[ {label: 'TOTAL ASSETS', val: assets.length, icon: PackageSearch}, {label: 'AVAILABLE', val: assets.filter(a => a.status === 'In Stock (Available)').length, icon: CheckCircle2}, {label: 'ASSIGNED', val: assets.filter(a => a.status === 'Assigned').length, icon: User}, {label: 'IN REPAIR', val: assets.filter(a => a.status === 'Maintenance').length, icon: Wrench}].map((s, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-xl"><s.icon size={24}/></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase">{s.label}</p><p className="text-2xl font-black">{s.val}</p></div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
             <div className="p-4 border-b"><div className="relative w-96"><Search className="absolute left-3 top-3 text-gray-400" size={18}/><input placeholder="Search assets..." className="w-full pl-10 py-2.5 bg-gray-50 rounded-xl text-sm" /></div></div>
             <table className="w-full text-left">
              <thead className="bg-gray-50"><tr><th className="p-4 text-xs font-black uppercase">Asset Details</th><th className="p-4 text-xs font-black uppercase">Category</th><th className="p-4 text-xs font-black uppercase">Status</th><th className="p-4 text-xs font-black uppercase">Assigned To</th></tr></thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedAsset(a); setViewState('view_details'); }}>
                    <td className="p-4 font-black text-[#008b74]">{a.name}</td>
                    <td className="p-4 text-sm font-bold">{a.category}</td>
                    <td className="p-4"><span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-bold">{a.status}</span></td>
                    <td className="p-4 text-sm">{a.assignedTo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Details View */}
      {viewState === 'view_details' && selectedAsset && (
        <div className="space-y-6">
          <button onClick={() => setViewState('list')} className="flex items-center gap-2 font-bold"><ArrowLeft size={16}/> Back</button>
          <div className="bg-white p-8 rounded-[24px] border shadow-sm">
            <h2 className="text-3xl font-black mb-6">{selectedAsset.name}</h2>
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-gray-50 p-6 rounded-2xl">
                <h4 className="font-black text-sm uppercase mb-4">Inspection Info</h4>
                <p className="font-bold">Status: {selectedAsset.inspection_status}</p>
                <p className="font-bold">Date: {selectedAsset.last_inspection_date}</p>
              </div>
              <div>
                <h4 className="font-black text-sm uppercase mb-4">Inspection Photos</h4>
                <div className="grid grid-cols-3 gap-2">{selectedAsset.photos?.map((p, i) => <img key={i} src={p} className="h-24 w-full object-cover rounded-lg" alt="Insp" />)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}