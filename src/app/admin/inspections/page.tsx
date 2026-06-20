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

// Helper to normalize the "Pending" status just in case
const isPending = (status: string) => status === 'Pending Admin Review' || status === 'Pending Approval';

export default function AdminInspectionsPage() {
  const [assets, setAssets] = useState<InspectionAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending Review' | 'Passed' | 'Failed' | 'Re-inspection'>('Pending Review');
  
  // Modal State
  const [selectedAsset, setSelectedAsset] = useState<InspectionAsset | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchInspections = async () => {
      try {
        // 1. Fetch Staff Profiles for Accurate Names
        const { data: profileData } = await supabase.from('profiles').select('emp_code, employee_code, emp_id, full_name, name');
        const staffMap: Record<string, string> = {};
        
        if (profileData) {
          profileData.forEach((s: any) => {
            const code = s.emp_code || s.employee_code || s.emp_id;
            const name = s.full_name || s.name;
            if (code && name) staffMap[code] = name;
          });
        }

        // 2. Fetch Assets that have inspection data
        const { data: assetData } = await supabase
          .from('assets')
          .select('*')
          .not('inspection_status', 'is', null)
          .order('updated_at', { ascending: false });

        if (isMounted && assetData) {
          setAssets(assetData.map((a: any) => ({
            ...a,
            staff_name: staffMap[a.emp_code] || a.assigned_to || a.staff_name || 'Unassigned',
            photos: a.photos || [],
            inspection_notes: a.inspection_notes || 'No notes provided.',
            // Normalize pending status from older code
            inspection_status: isPending(a.inspection_status) ? 'Pending Review' : a.inspection_status
          })));
        }
      } catch (error) {
        console.error("Error fetching inspections:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInspections();

    // 3. LIVE SUPABASE REALTIME SYNC
    // This listens to the database and instantly refreshes the list when Staff submits!
    const channel = supabase.channel('admin_inspections_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        fetchInspections(); 
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
      // Send the exact status the Staff dashboard expects ('Passed', 'Failed', 'Re-inspection')
      const { data, error } = await supabase
        .from('assets')
        .update({ inspection_status: newStatus })
        .eq('id', selectedAsset.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Database update failed. Check permissions.");

      // Instantly update Local State so it vanishes from the pending list
      setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, inspection_status: newStatus } : a));
      setSelectedAsset(null);
      
      alert(`Asset successfully marked as ${newStatus}!`);
      
    } catch (error: any) {
      alert("Error updating inspection: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredAssets = assets.filter(a => filter === 'All' || a.inspection_status === filter);
  const pendingCount = assets.filter(a => a.inspection_status === 'Pending Review').length;

  if (isLoading) return <div className="flex justify-center min-h-[60vh] items-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-7xl mx-auto px-4 sm:px-0">
      
      {/* HEADER */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#002B49] flex items-center gap-2">
              <ClipboardCheck size={28} className="text-orange-500" /> Inspection Reviews
            </h1>
            <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full animate-pulse tracking-wider uppercase">Live Sync Active</span>
          </div>
          <p className="text-sm font-medium text-gray-500 mt-1">Review condition reports and photos sent by staff instantly.</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 px-5 py-2 rounded-xl text-center w-full sm:w-auto">
          <p className="text-xs font-bold text-orange-600 uppercase">Needs Action</p>
          <p className="text-2xl font-black text-orange-900">{pendingCount}</p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex overflow-x-auto">
        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
          {['Pending Review', 'Passed', 'Failed', 'Re-inspection', 'All'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f as any)} 
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all whitespace-nowrap ${filter === f ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {f === 'Pending Review' ? 'Needs Action' : f}
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
                <th className="p-4 text-xs font-black text-gray-500 uppercase">Status & Date</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center font-bold text-gray-400">No inspections currently in this status.</td></tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                    <td className="p-4">
                      <p className="font-black text-[#002B49] text-sm">{asset.name}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-1 bg-gray-100 w-fit px-2 py-0.5 rounded uppercase border border-gray-200">{asset.tag_id}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-sm text-gray-700">{asset.staff_name}</p>
                      <p className="text-[11px] font-bold text-gray-400 uppercase mt-0.5">{asset.emp_code}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit shadow-sm ${
                          asset.inspection_status === 'Pending Review' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          asset.inspection_status === 'Re-inspection' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                          asset.inspection_status === 'Passed' ? 'bg-[#e6f7eb] text-[#008a4b] border border-green-200' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {asset.inspection_status}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 mt-1">
                          {asset.updated_at ? new Date(asset.updated_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedAsset(asset)}
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm ${
                          asset.inspection_status === 'Pending Review' 
                          ? 'bg-orange-600 text-white hover:bg-orange-700' 
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                      >
                        Review Report
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
          <div className="fixed inset-0 bg-gray-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[24px] w-full max-w-3xl shadow-2xl overflow-hidden my-8 border border-gray-100">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                <h2 className="text-xl font-black text-[#002B49] flex items-center gap-2">
                  <ShieldCheck className="text-orange-500" /> Verify Inspection
                </h2>
                <button onClick={() => setSelectedAsset(null)} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Asset & Staff Info Widget */}
                <div className="flex flex-col md:flex-row gap-4 justify-between bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Asset Evaluated</p>
                    <p className="font-black text-[#002B49] text-lg leading-tight">{selectedAsset.name}</p>
                    <p className="text-xs font-bold text-gray-500 mt-1">TAG: {selectedAsset.tag_id} | S/N: {selectedAsset.serial_number || 'N/A'}</p>
                  </div>
                  <div className="md:text-right border-t md:border-t-0 md:border-l border-blue-200/50 pt-3 md:pt-0 md:pl-5">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Inspected By</p>
                    <p className="font-black text-[#002B49] text-lg leading-tight">{selectedAsset.staff_name}</p>
                    <p className="text-xs font-bold text-gray-500 mt-1 uppercase">{selectedAsset.emp_code}</p>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-black text-[#002B49] mb-2 flex items-center gap-2">
                    <ClipboardCheck size={16} className="text-teal-600"/> Staff Notes & Condition
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl text-gray-700 text-sm whitespace-pre-wrap font-medium leading-relaxed shadow-inner">
                    {selectedAsset.inspection_notes}
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <h3 className="text-sm font-black text-[#002B49] mb-3 flex items-center gap-2">
                    <Camera size={16} className="text-teal-600"/> Photo Evidence ({selectedAsset.photos.length})
                  </h3>
                  {selectedAsset.photos.length === 0 ? (
                    <div className="text-sm text-gray-500 font-bold bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200 text-center">
                      No photos were provided by staff for this inspection.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {selectedAsset.photos.map((photo, idx) => (
                        <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 group relative shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 cursor-pointer" onClick={() => window.open(photo, '_blank')} />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Final Admin Decision</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button 
                      onClick={() => handleReviewAction('Passed')} 
                      disabled={isUpdating} 
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-[#bbf0ce] bg-[#e6f7eb] text-[#008a4b] hover:bg-[#008a4b] hover:text-white transition-all font-black text-sm shadow-sm group"
                    >
                      <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" /> 
                      Approve & Pass
                    </button>
                    
                    <button 
                      onClick={() => handleReviewAction('Re-inspection')} 
                      disabled={isUpdating} 
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white transition-all font-black text-sm shadow-sm group"
                    >
                      <RefreshCw size={24} className="group-hover:scale-110 transition-transform" /> 
                      Reject & Re-Request
                    </button>
                    
                    <button 
                      onClick={() => handleReviewAction('Failed')} 
                      disabled={isUpdating} 
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition-all font-black text-sm shadow-sm group"
                    >
                      <XCircle size={24} className="group-hover:scale-110 transition-transform" /> 
                      Mark as Failed
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