'use client';

import React, { useState, useEffect } from 'react';
import { PackageSearch, Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// Define the type for viewState
type ViewState = 'list' | 'add_single' | 'edit_asset' | 'bulk_upload' | 'print_tags' | 'view_details';

interface Asset {
  id: string;
  tag_id: string;
  name: string;
  category: string;
  status: string;
}

export default function AdminAssetsPage() {
  // 1. THIS IS THE LINE THAT WAS MISSING IN YOUR SCOPE
  const [viewState, setViewState] = useState<ViewState>('list');
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      const { data } = await supabase.from('assets').select('*');
      setAssets(data || []);
      setIsLoaded(true);
    };
    fetchAssets();
  }, []);

  if (!isLoaded) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="p-8">
      {/* 2. Now 'viewState' is defined and accessible here */}
      {viewState === 'list' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
            <h1 className="text-2xl font-black flex items-center gap-2">
              <PackageSearch className="text-[#008b74]" /> Asset Inventory
            </h1>
            <button 
              onClick={() => setViewState('add_single')} 
              className="bg-[#008b74] text-white px-4 py-2 rounded-xl font-bold"
            >
              <Plus size={18} /> Add Asset
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-xs font-black uppercase">Name</th>
                  <th className="p-4 text-xs font-black uppercase">Category</th>
                  <th className="p-4 text-xs font-black uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-black text-[#008b74]">{asset.name}</td>
                    <td className="p-4 text-sm font-bold">{asset.category}</td>
                    <td className="p-4 text-sm font-bold">{asset.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}