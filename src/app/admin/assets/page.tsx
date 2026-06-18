'use client';

import React, { useState, useEffect } from 'react';
import { PackageSearch, Plus, UploadCloud, Search, Printer, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// 1. Interface Definition
interface Asset {
  id: string;
  tag_id: string;
  name: string;
  category: string;
  status: string;
  assigned_to?: string;
}

// 2. Main Component
export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase.from('assets').select('*');
        if (error) throw error;
        setAssets(data || []);
      } catch (err) {
        console.error("Error loading assets:", err);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchAssets();
  }, []);

  if (!isLoaded) {
    return <div className="p-20 text-center font-black text-xl">Loading Inventory...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black mb-6">Asset Inventory</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 uppercase text-xs font-black">Name</th>
              <th className="p-4 uppercase text-xs font-black">Category</th>
              <th className="p-4 uppercase text-xs font-black">Status</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-t">
                <td className="p-4 font-bold">{asset.name}</td>
                <td className="p-4 text-sm">{asset.category}</td>
                <td className="p-4 text-sm">{asset.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}