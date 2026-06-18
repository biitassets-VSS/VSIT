'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PackageSearch, Plus, ArrowLeft, CheckCircle2, AlertCircle, Save, X, ImageIcon, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type ViewState = 'list' | 'add_single' | 'view_details';

interface Asset {
  id: string;
  tag_id: string;
  name: string;
  category: string;
  status: string;
  inspection_status?: string;
  inspection_notes?: string;
  photos?: string[];
}

export default function AdminAssetsPage() {
  const [viewState, setViewState] = useState<ViewState>('list');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      const { data } = await supabase.from('assets').select('*');
      setAssets(data || []);
      setIsLoaded(true);
    };
    fetchAssets();
  }, []);

  const openDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setViewState('view_details');
  };

  if (!isLoaded) return <div className="p-10 text-center font-bold text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      
      {/* 1. LIST VIEW */}
      {viewState === 'list' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <h1 className="text-2xl font-black flex items-center gap-2 text-gray-900">
              <PackageSearch className="text-[#008b74]" /> Asset Inventory
            </h1>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Name</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-black text-[#008b74]">{asset.name}</td>
                    <td className="p-4 font-bold text-sm">{asset.status}</td>
                    <td className="p-4">
                      <button onClick={() => openDetails(asset)} className="text-sm font-bold text-[#008b74] hover:underline">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DETAILS VIEW WITH INSPECTION TRACKING */}
      {viewState === 'view_details' && selectedAsset && (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
          <button onClick={() => setViewState('list')} className="flex items-center gap-2 font-bold text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="bg-white p-8 rounded-[24px] shadow-sm border border-gray-100">
            <h2 className="text-3xl font-black text-gray-900 mb-6">{selectedAsset.name}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Inspection Form */}
              <div className="space-y-4">
                <h3 className="font-black text-gray-900 flex items-center gap-2"><CheckCircle2 className="text-[#008b74]" /> Inspection Details</h3>
                <label className="block text-xs font-bold text-gray-500">Inspection Notes</label>
                <textarea className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200" placeholder="Enter inspection notes..." />
                
                <label className="block text-xs font-bold text-gray-500">Inspection Status</label>
                <select className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-bold">
                  <option>Passed</option>
                  <option>Failed</option>
                  <option>Pending Repair</option>
                </select>
                
                <button className="w-full bg-[#008b74] text-white py-3 rounded-xl font-black flex items-center justify-center gap-2">
                  <Save size={18} /> Save Inspection
                </button>
              </div>

              {/* Inspection Photos */}
              <div className="space-y-4">
                <h3 className="font-black text-gray-900 flex items-center gap-2"><ImageIcon className="text-[#008b74]" /> Inspection Photos</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedAsset.photos?.map((p, i) => <img key={i} src={p} className="rounded-xl w-full h-32 object-cover bg-gray-100" alt="Inspection" />)}
                  <div className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex flex-col items-center justify-center text-gray-400 cursor-pointer">
                    <Plus /> <span className="text-xs font-bold">Upload</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}