'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PackageSearch, Plus, UploadCloud, Search, 
  ArrowLeft, Download, CheckCircle2, AlertCircle, Save,
  Printer, QrCode, FileText, Image as ImageIcon,
  DollarSign, Wrench, Hash, Trash2, UserMinus, X, Pencil, User
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// --- Interfaces ---
interface Asset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: 'In Stock (Available)' | 'Assigned' | 'Maintenance' | 'Retired';
  assignedTo?: string;
  empCode?: string;
  serialNumber?: string;
  price?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  condition?: string;
  notes?: string;
  photos?: string[];
  inspection_status?: string;
  last_inspection_date?: string;
}

export default function AdminAssetsPage() {
  const [viewState, setViewState] = useState<'list' | 'add_single' | 'edit_asset' | 'bulk_upload' | 'view_details'>('list');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          const mappedAssets: Asset[] = data.map((dbAsset: any) => ({
            id: dbAsset.id,
            tagId: dbAsset.tag_id,
            name: dbAsset.name,
            category: dbAsset.category,
            status: dbAsset.status,
            assignedTo: dbAsset.assigned_to,
            empCode: dbAsset.emp_code,
            serialNumber: dbAsset.serial_number,
            price: dbAsset.price,
            purchaseDate: dbAsset.purchase_date,
            warrantyExpiry: dbAsset.warranty_expiry,
            condition: dbAsset.condition,
            notes: dbAsset.notes,
            photos: dbAsset.photos || [],
            inspection_status: dbAsset.inspection_status || 'Pending',
            last_inspection_date: dbAsset.last_inspection_date || 'N/A'
          }));
          setAssets(mappedAssets);
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchAssets();
  }, []);

  const openAssetDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setViewState('view_details');
  };

  if (!isLoaded) return <div className="p-10 text-center font-bold text-gray-500">Loading Assets...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto p-6">
      
      {/* 1. LIST VIEW */}
      {viewState === 'list' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <PackageSearch size={28} className="text-[#008b74]" /> Asset Inventory
            </h1>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Name</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Category</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => openAssetDetails(asset)}>
                    <td className="p-4 font-black text-[#008b74]">{asset.name}</td>
                    <td className="p-4 text-sm font-bold text-gray-600">{asset.category}</td>
                    <td className="p-4 text-sm font-bold">{asset.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DETAILS VIEW */}
      {viewState === 'view_details' && selectedAsset && (
        <div className="space-y-6">
          <button onClick={() => setViewState('list')} className="flex items-center gap-2 font-bold text-gray-500"><ArrowLeft size={16}/> Back</button>
          
          <div className="bg-white p-8 rounded-[24px] border shadow-sm">
            <div className="flex justify-between mb-8">
              <h2 className="text-3xl font-black">{selectedAsset.name}</h2>
              <div className={`px-4 py-2 rounded-xl font-black text-sm uppercase ${
                selectedAsset.inspection_status === 'Passed' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {selectedAsset.inspection_status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase">Due Date</p>
                <p className="font-bold text-gray-900">{selectedAsset.last_inspection_date}</p>
                
                <h4 className="mt-6 font-black uppercase text-sm">Notes</h4>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-xl">{selectedAsset.notes || 'No notes.'}</p>
              </div>

              <div>
                <h4 className="font-black uppercase text-sm mb-4">Inspection Photos</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedAsset.photos?.map((p, i) => (
                    <img key={i} src={p} alt="Inspection" className="rounded-xl w-full h-32 object-cover border" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}