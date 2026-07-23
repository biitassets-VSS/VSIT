'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { Camera, X, ShieldAlert, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// --- DATABASE TYPES ---
interface Asset {
  id: string | number;
  name: string;
  tag: string;
  serial: string;
  category: string;
  department: string;
  status: string;
}

interface StaffDashboardClientProps {
  initialAssets: Asset[];
}

const getInitials = (name: string) => {
  if (!name) return 'NA';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getAvatarGradient = (category: string) => {
  const cat = category?.toLowerCase();
  if (cat === 'laptop') return 'bg-gradient-to-br from-blue-400 to-blue-600';
  if (cat === 'mobile') return 'bg-gradient-to-br from-purple-400 to-purple-500';
  return 'bg-gradient-to-br from-pink-400 to-rose-500';
};

const getStatusStyle = (status: string) => {
  const stat = status?.toUpperCase();
  if (stat === 'ACTIVE' || stat === 'DEPLOYED') return 'text-green-600 bg-green-50 border-green-100';
  if (stat === 'OVER DUE' || stat === 'OVERDUE') return 'text-red-600 bg-red-50 border-red-100 animate-pulse';
  if (stat === 'WAITING' || stat === 'PENDING') return 'text-gray-500 bg-gray-50 border-gray-200';
  return 'text-gray-500 bg-gray-50 border-gray-200';
};

export default function StaffDashboardClient({ initialAssets }: StaffDashboardClientProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [verifyTag, setVerifyTag] = useState('');
  const [verifySerial, setVerifySerial] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});

  // Core function to refresh local state data cleanly from the database
  const refreshAssignedAssets = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch assets cleanly to bypass complex database-side .or() column crash errors
      const { data: dbAssets, error } = await supabase
        .from('assets')
        .select('*');

      if (error) throw error;

      // 2. Map row headers dynamically in memory to handle arbitrary naming conventions securely
      if (dbAssets) {
        const filtered = dbAssets.filter((asset: any) => {
          const emailMatch = (asset.assigned_to_email || asset.email || asset.staff_email) === user.email;
          const idMatch = (asset.assigned_to_id || asset.user_id || asset.staff_id) === user.id;
          
          const rawName = asset.employee_name || asset.staff_name || asset.assigned_to || asset.user_name || "";
          const nameMatch = String(rawName).toLowerCase().includes('mohit');

          return emailMatch || idMatch || nameMatch;
        });

        setAssets(filtered as Asset[]);
      }
    } catch (err) {
      console.error('Failed syncing live staff equipment metrics:', err);
    }
  }, []);

  // Sync state data on socket notification updates or local changes seamlessly
  useEffect(() => {
    refreshAssignedAssets();

    const liveChannel = supabase
      .channel('staff-grid-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets' },
        () => {
          refreshAssignedAssets();
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(liveChannel);
    };
  }, [refreshAssignedAssets, router]);

  const overdueAssets = assets.filter(a => {
    const s = a.status?.toUpperCase();
    return s === 'OVER DUE' || s === 'OVERDUE';
  });

  const filteredAssets = assets.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isVerified = !!selectedAsset && 
    verifyTag.trim().toLowerCase() === selectedAsset.tag?.toLowerCase() && 
    verifySerial.trim().toLowerCase() === selectedAsset.serial?.toLowerCase();

  const getRequiredAngles = (category: string) => {
    return category?.toLowerCase() === 'laptop' 
      ? ['Display & Keyboard', 'Top Side', 'Bottom Side', 'Left Side', 'Right Side']
      : ['Front Side', 'Back Side'];
  };

  const currentAngles = selectedAsset ? getRequiredAngles(selectedAsset.category) : [];

  const handleCapture = (angle: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setPhotos(prev => ({ ...prev, [angle]: canvas.toDataURL('image/jpeg') }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const submitInspection = async () => {
    if (Object.keys(photos).length < currentAngles.length) {
      toast.error(`Please capture all ${currentAngles.length} required photos!`);
      return;
    }

    try {
      const { error } = await supabase
        .from('assets')
        .update({ status: 'WAITING' })
        .eq('id', selectedAsset?.id);

      if (error) throw error;

      toast.success("Inspection Submitted! Waiting for Approval.");
      refreshAssignedAssets();
      closeModal();
    } catch (error) {
      toast.error("Failed to submit inspection to the server.");
    }
  };

  const closeModal = () => {
    setIsInspectionOpen(false);
    setSelectedAsset(null);
    setPhotos({});
    setVerifyTag('');
    setVerifySerial('');
  };

  return (
    <div className="font-sans">
      <Toaster position="top-center" />

      <div className="space-y-8 pb-12">
        {/* OVERDUE ALERT */}
        {overdueAssets.length > 0 && (
          <div className="bg-white border-l-4 border-red-500 p-4 rounded-xl shadow-sm flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert size={24} className="text-red-500" />
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Action Required: Overdue Inspections</h3>
                <p className="text-gray-500 text-xs mt-0.5">You have {overdueAssets.length} asset(s) pending inspection.</p>
              </div>
            </div>
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search by Name, Tag ID, or Category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-500 shadow-sm" />
          </div>
        </div>

        {/* ASSETS GRID */}
        {assets.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
            No assets assigned to you at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAssets.map((asset) => (
              <motion.div key={asset.id} whileHover={{ y: -2 }} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${getAvatarGradient(asset.category)} text-white flex items-center justify-center text-lg font-bold shadow-sm`}>
                    {getInitials(asset.name)}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${getStatusStyle(asset.status)}`}>{asset.status}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{asset.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{asset.tag}</p>
                  <p className="text-sm text-gray-600 mt-3">{asset.category}</p>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { setSelectedAsset(asset); setIsInspectionOpen(true); }} disabled={asset.status?.toUpperCase() === 'WAITING'} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${asset.status?.toUpperCase() === 'WAITING' ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-[#F0FDF4] text-[#16A34A] hover:bg-green-100'}`}>
                    {asset.status?.toUpperCase() === 'WAITING' ? 'Under Review' : 'Inspect'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* INSPECTION MODAL */}
      <AnimatePresence>
        {isInspectionOpen && selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
              <div className="border-b border-gray-100 p-5 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
                <div><h2 className="text-xl font-bold">Asset Inspection</h2><p className="text-gray-500 text-sm">{selectedAsset.name}</p></div>
                <button onClick={closeModal} className="text-gray-400 p-2 rounded-full hover:bg-gray-100"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Enter Tag ID</label>
                    <input type="text" className="w-full p-2.5 border rounded-lg outline-none text-sm border-gray-200" value={verifyTag} onChange={e => setVerifyTag(e.target.value)} disabled={isVerified} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Enter Serial Number</label>
                    <input type="text" className="w-full p-2.5 border rounded-lg outline-none text-sm border-gray-200" value={verifySerial} onChange={e => setVerifySerial(e.target.value)} disabled={isVerified} />
                  </div>
                </div>
                <div className={!isVerified ? 'opacity-40 pointer-events-none' : ''}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                    {currentAngles.map((angle) => (
                      <div key={angle} className="relative aspect-square border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center">
                        {photos[angle] ? <img src={photos[angle]} className="w-full h-full object-cover rounded-xl" /> : <div className="text-center p-2"><Camera className="mx-auto text-gray-300 mb-2" size={28} /><p className="text-xs font-semibold text-gray-500">{angle}</p></div>}
                        <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleCapture(angle, e)} disabled={!isVerified} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                <button onClick={closeModal} className="px-5 py-2 text-sm font-semibold hover:bg-gray-100 rounded-xl">Cancel</button>
                <button onClick={submitInspection} disabled={!isVerified} className={`px-6 py-2.5 text-sm font-bold rounded-xl text-white ${isVerified ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300'}`}>Submit</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}