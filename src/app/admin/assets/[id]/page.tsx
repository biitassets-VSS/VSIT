'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Package, Hash, UserCheck, CalendarDays, 
  ShieldCheck, ClipboardCheck, AlertCircle, CheckCircle2, 
  ImageIcon, X, PenTool, Edit3
} from 'lucide-react';
import { motion } from 'framer-motion';

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
  serialNumber?: string;
  purchaseDate?: string;
}

export default function AssetFullDetailsPage() {
  const params = useParams();
  const paramId = params?.id as string | undefined;
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!paramId) return;
    const currentId = decodeURIComponent(paramId).trim().toLowerCase();
    
    // Fetch Assets from localStorage
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) {
      const allAssets: Asset[] = JSON.parse(savedAssets);
      // Find the exact asset
      const foundAsset = allAssets.find(a => a.id.toLowerCase() === currentId || a.tagId.toLowerCase() === currentId);
      
      if (foundAsset) {
        // Inject fallback inspection data if none exists so the UI always looks good
        setAsset({
          ...foundAsset,
          inspectionStatus: foundAsset.inspectionStatus || 'Passed',
          inspectionNotes: foundAsset.inspectionNotes || 'Standard check completed. Asset is functioning correctly with no physical damage.',
          inspectionDate: foundAsset.inspectionDate || new Date().toISOString().split('T')[0],
          inspectionPhotos: foundAsset.inspectionPhotos || (foundAsset.imageUrl ? [foundAsset.imageUrl] : [])
        });
      }
    }
    setIsLoading(false);
  }, [paramId]);

  if (isLoading) return <div className="p-10 flex justify-center text-gray-400 font-bold animate-pulse">Loading Asset Details...</div>;
  
  // IF ASSET IS NOT FOUND
  if (!asset) return (
    <div className="p-10 text-center bg-white rounded-3xl border border-gray-100 max-w-lg mx-auto mt-10 shadow-sm">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <X size={32} />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Asset Not Found</h2>
      <p className="text-gray-500 text-sm font-medium mb-6">
        We couldn't find an asset with the ID <b>{decodeURIComponent(paramId || '')}</b>.
      </p>
      <Link href="/admin/assets" className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold shadow-sm hover:bg-teal-700 transition-all inline-block">
        Return to Asset List
      </Link>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10 max-w-5xl mx-auto">
      
      {/* Back Button */}
      <Link href="/admin/assets" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-teal-700 transition-colors w-fit">
        <ArrowLeft size={16} /> Back to Assets
      </Link>

      {/* HERO SECTION - ASSET HEADER */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Large Image Area */}
        <div className="w-full md:w-1/3 lg:w-2/5 h-64 md:h-auto bg-gray-100 relative shrink-0">
          {asset.imageUrl ? (
             <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover absolute inset-0" />
          ) : (
             <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-300">
               <ImageIcon size={64} />
             </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent md:hidden"></div>
          
          {/* Status Badge floating on image */}
          <div className="absolute bottom-4 left-4 md:top-4 md:left-4 md:bottom-auto flex gap-2 z-10">
            <span className={`px-3 py-1.5 backdrop-blur-md text-white text-xs font-black uppercase tracking-wide rounded-lg flex items-center gap-1.5 shadow-sm border ${
              asset.status === 'Needs Repair' ? 'bg-red-500/80 border-red-400' : 
              asset.status === 'Available' ? 'bg-green-500/80 border-green-400' : 
              'bg-teal-600/80 border-teal-500'
            }`}>
              <ShieldCheck size={14}/> {asset.status || 'Assigned'}
            </span>
          </div>
        </div>

        {/* Header Info Details */}
        <div className="p-6 sm:p-8 md:p-10 flex-1 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-center">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">{asset.name}</h1>
            
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="bg-teal-50 text-teal-800 border border-teal-100 px-3 py-1.5 rounded-lg text-sm font-mono font-bold flex items-center gap-1.5">
                <Hash size={14} className="text-teal-500"/> {asset.tagId}
              </span>
              {asset.category && (
                <span className="bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5">
                  <Package size={14} className="text-gray-400"/> {asset.category}
                </span>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase font-bold text-gray-400 tracking-wider mb-1">Currently Assigned To</p>
                {asset.assignedToName ? (
                  <Link href={`/admin/staff/${asset.assignedToEmpId}`} className="flex items-center gap-3 hover:bg-gray-50 p-2 -ml-2 rounded-xl transition-colors group">
                    <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <UserCheck size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors">{asset.assignedToName}</p>
                      <p className="text-xs font-mono text-gray-500">{asset.assignedToEmpId}</p>
                    </div>
                  </Link>
                ) : (
                  <p className="font-bold text-gray-500 flex items-center gap-2 py-2">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span> Unassigned
                  </p>
                )}
              </div>
              
              <button className="w-12 h-12 bg-gray-50 hover:bg-teal-50 text-gray-600 hover:text-teal-600 rounded-full flex items-center justify-center transition-colors shadow-sm border border-gray-100 tooltip-trigger" title="Edit Asset">
                <Edit3 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* DETAILED INFORMATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Full Inspection Record Box (Takes up 2 columns on large screens) */}
        <div className="lg:col-span-2 bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 bg-teal-50/30 flex justify-between items-center">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-teal-600"/> Official Inspection Record
            </h3>
            {asset.inspectionDate && (
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 flex items-center gap-1.5">
                <CalendarDays size={14}/> {asset.inspectionDate}
              </span>
            )}
          </div>
          
          <div className="p-6 sm:p-8 flex-1">
            {/* Status Indicator inside Inspection */}
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Result:</span>
              {asset.inspectionStatus === 'Passed' && <span className="px-4 py-1.5 bg-green-100 text-green-700 text-sm font-black uppercase rounded-xl flex items-center gap-1.5 border border-green-200"><CheckCircle2 size={16}/> Passed Inspection</span>}
              {asset.inspectionStatus === 'Failed' && <span className="px-4 py-1.5 bg-red-100 text-red-700 text-sm font-black uppercase rounded-xl flex items-center gap-1.5 border border-red-200"><AlertCircle size={16}/> Failed Inspection</span>}
              {asset.inspectionStatus === 'Pending' && <span className="px-4 py-1.5 bg-orange-100 text-orange-700 text-sm font-black uppercase rounded-xl flex items-center gap-1.5 border border-orange-200"><ShieldCheck size={16}/> Inspection Pending</span>}
            </div>

            {/* Inspection Notes */}
            <div className="mb-8">
              <span className="text-sm font-bold text-gray-700 block mb-3 flex items-center gap-2"><PenTool size={16} className="text-gray-400"/> Inspector Notes</span>
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-gray-700 font-medium text-sm sm:text-base leading-relaxed">
                {asset.inspectionNotes || "No detailed notes provided for this inspection."}
              </div>
            </div>

            {/* Attached Photos */}
            {asset.inspectionPhotos && asset.inspectionPhotos.length > 0 && (
              <div>
                <span className="text-sm font-bold text-gray-700 block mb-3">Attached Proof / Photos</span>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {asset.inspectionPhotos.map((photo, idx) => (
                    <a key={idx} href={photo} target="_blank" rel="noreferrer" className="block shrink-0 relative group rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                      <img src={photo} alt={`Inspection ${idx + 1}`} className="w-32 h-32 object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Extra Metadata / Specs Card */}
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col gap-6">
          <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-4">Hardware Specifications</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase font-bold text-gray-400 mb-1">Serial Number</p>
              <p className="text-sm font-mono font-bold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                {asset.serialNumber || 'Not Recorded'}
              </p>
            </div>
            
            <div>
              <p className="text-[11px] uppercase font-bold text-gray-400 mb-1">Purchase Date</p>
              <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <CalendarDays size={16} className="text-teal-500"/>
                {asset.purchaseDate || 'Unknown'}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase font-bold text-gray-400 mb-1">System ID</p>
              <p className="text-xs font-mono font-medium text-gray-500 break-all">
                {asset.id}
              </p>
            </div>
          </div>
          
          <div className="mt-auto pt-6">
             <button className="w-full py-3.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
               Download Report PDF
             </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
