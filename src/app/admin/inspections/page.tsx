'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, CheckCircle2, XCircle, AlertCircle, 
  RefreshCw, Loader2, Search, Filter, Camera, ShieldCheck, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface InspectionAsset {
  id: string;
  tag_id: string;
  name: string;
  category: string;
  serial_number: string | null;
  emp_code: string;
  staff_name?: string;
  inspection_status: string;
  inspection_notes: string;
  photos: string[];
  updated_at: string;
}

export default function AdminInspectionsPage() {
  const [assets, setAssets] = useState<InspectionAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending Admin Review' | 'Good' | 'Faulty' | 'Re-Inspection'>('Pending Admin Review');
  
  // Modal State
  const [selectedAsset, setSelectedAsset] = useState<InspectionAsset | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchInspections = async () => {
      try {
        // FIXED: Using Profile table dragnet to guarantee accurate Staff Names
        const { data: profileData } = await supabase.from('profiles').select('*');
        const staffMap: Record<string, string> = {};
        
        if (profileData) {
          profileData.forEach((p: any) => {
            const code = p.emp_code || p.employee_code || p.employee_id || p.emp_id || 'N/A';
            const name = p.full_name || p.name || 'Staff Member';
            if (code !== 'N/A') staffMap[code] = name;
          });
        }

        const { data: assetData } = await supabase.from('assets').select('*').not('inspection_status', 'is', null).order('updated_at', { ascending: false });
        
        if (isMounted && assetData) {
          setAssets(assetData.map((a: any) => ({
            ...a,
            staff_name: staffMap[a.emp_code] || a.assigned_to || a.staff_name || 'Unassigned',
            photos: a.photos || [],
            inspection_notes: a.inspection_notes || 'No notes provided.'
          })));
        }
      } catch (error) {
        console.error("Error fetching inspections:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInspections();

    // REAL-TIME LISTENER FOR ADMIN INSPECTIONS (Now listens to both INSERT and UPDATE)
    const channel = supabase.channel('admin_assets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        fetchInspections(); // Refresh instantly when staff submits or admin updates
      }).subscribe();

    return () => { 
      isMounted = false;
      supabase.removeChannel(channel); 
    };
  }, []);

  const handleReviewAction = async (newStatus: string) => {
    if (!selectedAsset) return;
    setIsUpdating(true);

    try {
      // Changed to .select() to ensure the database successfully updated before changing UI
      const { data, error } = await supabase
        .from('assets')
        .update({ inspection_status: newStatus })
        .eq('id', selectedAsset.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Database update failed. Check RLS permissions.");

      // Update Local State instantly
      setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, inspection_status: newStatus } : a));
      setSelectedAsset(null);
      
      // Auto-switch filter if there are no more pending items to keep UI clean
      if (newStatus !== 'Pending Admin Review' && pendingCount <= 1) {
          setFilter('All');
      }

      alert(`Asset marked as ${newStatus}!`);
      
    } catch (error: any) {
      alert("Error updating inspection: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredAssets = assets.filter(a => filter === 'All' || a.inspection_status === filter);
  const pendingCount = assets.filter(a => a.inspection_status === 'Pending Admin Review').length;

  if (isLoading) return <div className="flex justify-center min-h-[60vh] items-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <ClipboardCheck size={28} className="text-orange-500" /> Inspection Reviews
            </h1>
            <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full animate-pulse">Live Sync Active</span>
          </div>
          <p className="text-sm font-medium text-gray-500 mt-1">Review condition reports and photos sent by staff.</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-xl text-center">
          <p className="text-xs font-bold text-orange-600 uppercase">Pending Review</p>
          <p className="text-xl font-black text-orange-900">{pendingCount}</p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex overflow-x-auto">
        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
          {['Pending Admin Review', 'Good', 'Faulty', 'Re-Inspection', 'All'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f as any)} 
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filter === f ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {f === 'Pending Admin Review' ? 'Needs Action' : f}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="p-4 text-xs font-black text-gray-500 uppercase">Asset & ID</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase">Staff Member</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase">Status</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center font-bold text-gray-400">No inspections found in this category.</td></tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-black text-gray-900 text-sm">{asset.name}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5 bg-gray-100 w-fit px-2 py-0.5 rounded border border-gray-200">{asset.tag_id}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-sm text-gray-700">{asset.staff_name}</p>
                      <p className="text-xs font-medium text-gray-500">{asset.emp_code}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 w-fit ${
                        asset.inspection_status === 'Pending Admin Review' ? 'bg-blue-100 text-blue-700' :
                        asset.inspection_status === 'Re-Inspection' ? 'bg-amber-100 text-amber-700' :
                        asset.inspection_status === 'Good' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {asset.inspection_status === 'Pending Admin Review' ? 'Needs Review' : asset.inspection_status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedAsset(asset)}
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          asset.inspection_status === 'Pending Admin Review' 
                          ? 'bg-orange-600 text-white hover:bg-orange-700' 
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REVIEW MODAL */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] w-full max-w-3xl shadow-2xl overflow-hidden my-8">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="text-orange-500" /> Inspection Review
                </h2>
                <button onClick={() => setSelectedAsset(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* Asset & Staff Info */}
                <div className="flex flex-col md:flex-row gap-4 justify-between bg-blue-50 border border-blue-100 p-4 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase">Asset Evaluated</p>
                    <p className="font-black text-gray-900 text-lg">{selectedAsset.name}</p>
                    <p className="text-sm font-bold text-gray-600">Tag: {selectedAsset.tag_id} | S/N: {selectedAsset.serial_number || 'N/A'}</p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-xs font-bold text-blue-600 uppercase">Inspected By</p>
                    <p className="font-black text-gray-900 text-lg">{selectedAsset.staff_name}</p>
                    <p className="text-sm font-bold text-gray-600">{selectedAsset.emp_code}</p>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-black text-gray-900 mb-2">Staff Notes & Current Condition</h3>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-700 text-sm whitespace-pre-wrap font-medium">
                    {selectedAsset.inspection_notes}
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2"><Camera size={16}/> Photo Evidence ({selectedAsset.photos.length})</h3>
                  {selectedAsset.photos.length === 0 ? (
                    <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">No photos provided by staff.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedAsset.photos.map((photo, idx) => (
                        <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-black text-gray-900 mb-3 text-center">Admin Decision</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button onClick={() => handleReviewAction('Good')} disabled={isUpdating} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all font-bold text-xs group">
                      <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" /> Mark as Good
                    </button>
                    <button onClick={() => handleReviewAction('Scratched')} disabled={isUpdating} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-all font-bold text-xs group">
                      <AlertCircle size={24} className="group-hover:scale-110 transition-transform" /> Mark Scratched
                    </button>
                    <button onClick={() => handleReviewAction('Faulty')} disabled={isUpdating} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition-all font-bold text-xs group">
                      <XCircle size={24} className="group-hover:scale-110 transition-transform" /> Mark Faulty
                    </button>
                    <button onClick={() => handleReviewAction('Re-Inspection')} disabled={isUpdating} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-800 hover:text-white transition-all font-bold text-xs group">
                      <RefreshCw size={24} className="group-hover:scale-110 transition-transform" /> Request Re-Inspection
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}