'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, Search, Plus, Hash, UserCheck, Eye, X, 
  ImageIcon, Info, ShieldCheck, ClipboardCheck, 
  AlertCircle, CheckCircle2, CalendarDays, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Interfaces
interface Asset { 
  id: string; 
  name: string; 
  tagId: string; 
  category?: string; 
  assignedToEmpId?: string;
  assignedToName?: string;
  imageUrl?: string; 
  status?: string;
  inspectionStatus?: 'Passed' | 'Failed' | 'Pending';
  inspectionNotes?: string;
  inspectionDate?: string;
  inspectionPhotos?: string[];
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    // Fetch assets from local storage
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    
    if (savedAssets) {
      setAssets(JSON.parse(savedAssets));
    } else {
      // Fallback Demo Data (so you can see the beautiful popup immediately)
      setAssets([
        { 
          id: 'A-100', name: 'MacBook Pro M2', tagId: 'TAG-8099', category: 'Laptops', 
          assignedToEmpId: 'EMP-001', assignedToName: 'Lakhwinder Singh', status: 'Assigned',
          imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=1000',
          inspectionStatus: 'Passed', inspectionDate: '2024-05-12',
          inspectionNotes: 'Asset is in excellent working condition. No physical damage reported on the screen or chassis.',
          inspectionPhotos: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=200']
        },
        { 
          id: 'A-101', name: 'Dell 27" 4K Monitor', tagId: 'TAG-8100', category: 'Accessories', 
          status: 'Available',
          imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=1000',
          inspectionStatus: 'Pending', inspectionDate: '2024-05-10',
          inspectionNotes: 'Awaiting standard quarterly inspection.'
        },
        { 
          id: 'A-102', name: 'Logitech MX Master 3', tagId: 'TAG-8105', category: 'Peripherals', 
          assignedToEmpId: 'EMP-505', assignedToName: 'Demo Staff', status: 'Needs Repair',
          inspectionStatus: 'Failed', inspectionDate: '2024-05-14',
          inspectionNotes: 'Scroll wheel is sticking and Bluetooth connection drops intermittently. Needs replacement.'
        }
      ]);
    }
    setIsLoading(false);
  }, []);

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    asset.tagId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Package size={24} className="text-teal-600" /> Asset Inventory
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage, inspect, and track company devices.</p>
        </div>
        <Link href="/admin/assets/new" className="w-full sm:w-auto px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
          <Plus size={18} /> Add New Asset
        </Link>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl">
          <Search size={18} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by asset name or Tag ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 placeholder:text-gray-400"
          />
        </div>
        <button className="p-4 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
          <Filter size={18} />
        </button>
      </div>

      {/* ASSET LIST */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center font-bold text-gray-400">Loading Assets...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm font-bold bg-gray-50">No assets found. Try adjusting your search.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 sm:gap-4 sm:p-4 divide-y divide-gray-100 sm:divide-y-0">
            {filteredAssets.map(asset => (
              
              // RESPONSIVE ASSET CARD
              <div key={asset.id} className="p-4 sm:p-5 sm:bg-white sm:border sm:border-gray-100 sm:shadow-sm sm:rounded-2xl hover:border-teal-200 transition-all flex items-center gap-4 group">
                
                {/* Thumbnail */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center relative">
                  {asset.imageUrl ? <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-400" />}
                  {/* Status Indicator Dot */}
                  <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${asset.status === 'Needs Repair' ? 'bg-red-500' : asset.status === 'Available' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col items-start">
                  
                  {/* CLICKABLE ASSET NAME -> OPENS POPUP */}
                  <button 
                    onClick={() => setSelectedAsset(asset)} 
                    className="font-black text-sm sm:text-base text-gray-900 text-left hover:text-teal-600 truncate w-full transition-colors mb-1"
                  >
                    {asset.name}
                  </button>
                  
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-mono bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <Hash size={10}/> {asset.tagId}
                    </span>
                    {asset.assignedToName && (
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[120px]">
                        <UserCheck size={10}/> {asset.assignedToName}
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedAsset(asset)}
                  className="w-10 h-10 shrink-0 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-colors"
                >
                  <Eye size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* ========================================================================= */}
      {/* ASSET DETAILS POP-UP MODAL (WITH INSPECTION DATA)                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedAsset(null)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
            >
              {/* IMAGE HEADER */}
              <div className="w-full h-48 sm:h-56 bg-gray-100 relative shrink-0">
                {selectedAsset.imageUrl ? <img src={selectedAsset.imageUrl} alt={selectedAsset.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300"><ImageIcon size={48} /></div>}
                
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
                <button onClick={() => setSelectedAsset(null)} className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full"><X size={20} /></button>
                <span className="absolute bottom-4 left-4 px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase rounded-lg shadow-sm flex items-center gap-1.5">
                  <ShieldCheck size={12}/> {selectedAsset.status || 'Assigned'}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-4">{selectedAsset.name}</h3>
                
                {/* BASIC INFO */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Tag ID</p>
                    <p className="text-xs sm:text-sm font-mono font-bold text-gray-800 flex items-center gap-1"><Hash size={12} className="text-teal-500"/>{selectedAsset.tagId}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Assigned To</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1 truncate"><UserCheck size={12} className="text-teal-500 shrink-0"/>{selectedAsset.assignedToName || 'Unassigned'}</p>
                  </div>
                </div>

                {/* INSPECTION RECORD SECTION */}
                <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-black uppercase text-teal-800 flex items-center gap-2">
                      <ClipboardCheck size={16}/> Inspection Record
                    </h4>
                    {/* Date */}
                    {selectedAsset.inspectionDate && (
                      <span className="text-[10px] font-bold text-teal-600 flex items-center gap-1">
                        <CalendarDays size={10}/> {selectedAsset.inspectionDate}
                      </span>
                    )}
                  </div>
                  
                  {/* Status Tags */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600">Latest Status:</span>
                    {selectedAsset.inspectionStatus === 'Passed' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-md flex items-center gap-1"><CheckCircle2 size={12}/> Passed</span>}
                    {selectedAsset.inspectionStatus === 'Failed' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-md flex items-center gap-1"><AlertCircle size={12}/> Failed</span>}
                    {selectedAsset.inspectionStatus === 'Pending' && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black uppercase rounded-md flex items-center gap-1"><ShieldCheck size={12}/> Pending</span>}
                    {!selectedAsset.inspectionStatus && <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-black uppercase rounded-md">No Record</span>}
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <span className="text-xs font-bold text-gray-600 block mb-1">Inspector Notes:</span>
                    <p className="text-sm font-medium text-gray-700 bg-white p-3 rounded-xl border border-teal-100">
                      {selectedAsset.inspectionNotes || "No inspection notes have been recorded for this asset yet."}
                    </p>
                  </div>

                  {/* Photos */}
                  {selectedAsset.inspectionPhotos && selectedAsset.inspectionPhotos.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-gray-600 block mb-2">Attached Photos:</span>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {selectedAsset.inspectionPhotos.map((photo, idx) => (
                          <img key={idx} src={photo} alt="Inspection Proof" className="w-16 h-16 rounded-lg object-cover border border-teal-200 shadow-sm shrink-0" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Full Page Button */}
                <Link href={`/admin/assets/${selectedAsset.id}`} className="mt-5 w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold text-center rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                  <Info size={16}/> Go To Full Asset Page
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
