'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, UserCheck, Package, Hash, Mail, Phone, 
  CalendarDays, Power, Eye, X, ImageIcon, Info, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Interfaces
interface Staff { 
  empId: string; 
  name: string; 
  department: string; 
  isActive: boolean;
  email?: string;
  phone?: string;
  dob?: string;
  joiningDate?: string;
}

interface Asset { 
  id: string; 
  name: string; 
  tagId: string; 
  category?: string; 
  assignedToEmpId?: string;
  imageUrl?: string;
  status?: string;
  condition?: string;
}

export default function StaffProfilePage() {
  const params = useParams();
  const paramId = params?.id as string | undefined;
  
  const [staff, setStaff] = useState<Staff | null>(null);
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    if (!paramId) return;

    // 1. Bulletproof ID Matching (ignores case and hidden spaces)
    const currentId = decodeURIComponent(paramId).trim().toLowerCase();

    // 2. Fetch staff members from Local Storage
    const savedStaff = localStorage.getItem('vsit_staff_users');
    let allStaff: Staff[] = [];
    
    if (savedStaff) {
      allStaff = JSON.parse(savedStaff);
    } else {
      // Fallback mock data if local storage is completely empty
      allStaff = [
        { empId: 'EMP-001', name: 'Lakhwinder Singh', department: 'IT Department', isActive: true, email: 'lakhwinder@vsit.com', phone: '+91 9876543210' },
        { empId: 'EMP-505', name: 'Mock User (Demo)', department: 'Demo Dept', isActive: true, email: 'demo@vsit.com', phone: '123-456-7890' } // Fallback for your link
      ];
    }

    // Find the exact user
    const foundStaff = allStaff.find(s => s.empId?.trim().toLowerCase() === currentId);
    setStaff(foundStaff || null);

    // 3. Fetch their assigned assets (with mock thumbnails just in case)
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) {
      const allAssets: Asset[] = JSON.parse(savedAssets);
      setAssignedAssets(allAssets.filter(a => a.assignedToEmpId?.trim().toLowerCase() === currentId));
    } else {
      // Provide some mock assets so the UI isn't empty if you cleared your cache
      if (currentId === 'emp-505' || currentId === 'emp-001') {
        setAssignedAssets([
          { 
            id: 'A-100', name: 'MacBook Pro M2', tagId: 'TAG-8099', category: 'Laptops', 
            assignedToEmpId: currentId, status: 'Assigned', condition: 'Good',
            imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=1000'
          },
          { 
            id: 'A-101', name: 'Dell 27" 4K Monitor', tagId: 'TAG-8100', category: 'Accessories', 
            assignedToEmpId: currentId, status: 'Assigned', condition: 'New',
            imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=1000'
          }
        ]);
      }
    }
    
    setIsLoading(false);
  }, [paramId]);

  if (isLoading) return <div className="p-10 flex justify-center text-gray-400 font-bold animate-pulse">Loading Profile...</div>;
  
  if (!staff) return (
    <div className="p-10 text-center bg-white rounded-3xl border border-gray-100 max-w-lg mx-auto mt-10 shadow-sm">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <X size={32} />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Staff Member Not Found</h2>
      <p className="text-gray-500 text-sm font-medium mb-6">
        We couldn't find a user with the ID <b>{decodeURIComponent(paramId || '')}</b>. <br/><br/>
        <i>Note: If you created this user on another device, it won't appear here because data is currently saved locally to your browser.</i>
      </p>
      <Link href="/admin/staff" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-all inline-block">
        Return to Staff List
      </Link>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">
      
      {/* Back Button */}
      <Link href="/admin/staff" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors w-fit">
        <ArrowLeft size={16} /> Back to Staff List
      </Link>

      {/* Staff Profile Header */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* Decorative Background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="h-20 w-20 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
            <UserCheck size={36} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{staff.name}</h1>
            <p className="text-sm font-bold text-gray-500 mt-1">{staff.department} • <span className="text-gray-400 font-mono">{staff.empId}</span></p>
            
            <div className="mt-3">
              <span className={`px-3 py-1.5 text-[11px] font-black rounded-lg uppercase tracking-wide inline-flex items-center gap-1.5 ${
                staff.isActive ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                <Power size={12} /> {staff.isActive ? 'Account Active' : 'Account Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-100 shadow-sm w-full md:w-auto min-w-[280px] space-y-3 relative z-10">
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><Mail size={14} className="text-gray-500"/></div>
            {staff.email || 'No email provided'}
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><Phone size={14} className="text-gray-500"/></div>
            {staff.phone || 'No phone provided'}
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><CalendarDays size={14} className="text-gray-500"/></div>
            Joined: {staff.joiningDate || 'N/A'}
          </div>
        </div>
      </div>

      {/* Assigned Assets Section with THUMBNAILS */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Package size={18} className="text-blue-500"/> Assigned Assets
          </h3>
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">{assignedAssets.length} Items</span>
        </div>
        
        {assignedAssets.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
            <Package size={32} className="text-gray-300"/>
            <p className="text-gray-500 text-sm font-bold">No assets currently assigned to this employee.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assignedAssets.map(asset => (
              <div key={asset.id} className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-4 group">
                
                {/* Small Thumbnail Preview */}
                <div className="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {asset.imageUrl ? (
                    <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <ImageIcon size={24} className="text-gray-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 text-base truncate pr-2">{asset.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded-md flex items-center gap-1">
                      <Hash size={10}/> {asset.tagId}
                    </span>
                    {asset.category && (
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                        {asset.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={() => setSelectedAsset(asset)}
                  className="w-10 h-10 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors shrink-0 tooltip-trigger"
                  title="View Details"
                >
                  <Eye size={18} />
                </button>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* BEAUTIFUL ASSET DETAIL POP-UP MODAL                      */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            
            {/* Dark blur backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" 
              onClick={() => setSelectedAsset(null)} 
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Top Large Thumbnail */}
              <div className="w-full h-56 bg-gray-100 relative group">
                {selectedAsset.imageUrl ? (
                  <img src={selectedAsset.imageUrl} alt={selectedAsset.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                    <ImageIcon size={48} />
                  </div>
                )}
                
                {/* Gradient Overlay for text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
                
                {/* Close Button overlapping image */}
                <button 
                  onClick={() => setSelectedAsset(null)} 
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>

                {/* Floating Status Badge */}
                <div className="absolute bottom-4 left-6 flex gap-2">
                  <span className="px-3 py-1 bg-green-500/90 backdrop-blur-md text-white text-xs font-black uppercase tracking-wide rounded-lg flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck size={14}/> {selectedAsset.status || 'Assigned'}
                  </span>
                </div>
              </div>

              {/* Detail Info */}
              <div className="p-6 sm:p-8">
                <h3 className="text-2xl font-black text-gray-900">{selectedAsset.name}</h3>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Asset Tag ID</p>
                    <p className="text-sm font-mono font-bold text-gray-800 flex items-center gap-1.5"><Hash size={14} className="text-blue-500"/> {selectedAsset.tagId}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Category</p>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Package size={14} className="text-blue-500"/> {selectedAsset.category || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Link 
                    href={`/admin/assets/${selectedAsset.id}`}
                    className="flex-1 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold text-center rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Info size={16}/> Go to Full Asset Page
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
