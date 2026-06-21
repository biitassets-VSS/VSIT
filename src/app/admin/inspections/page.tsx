'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, ClipboardCheck, CheckCircle2, XCircle, Clock, 
  Eye, Laptop, User, Calendar, ShieldAlert, AlertCircle, Search, RefreshCw, X
} from 'lucide-react';

export default function AdminInspectionReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Action state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  useEffect(() => {
    fetchVerificationLedger();
  }, []);

  const fetchVerificationLedger = async () => {
    setLoading(true);
    try {
      // Fetch 1: All Inspections
      const { data: rawInspections, error: inspErr } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (inspErr) throw inspErr;

      // Fetch 2: All Assets (to get device names & Serial numbers)
      const { data: assetsData } = await supabase.from('assets').select('*');

      // Fetch 3: All Profiles (to get clean Employee Names & Emp Codes)
      const { data: profilesData } = await supabase.from('profiles').select('*');

      // Map the 3 tables together into one rich master object
      const masterLedger = (rawInspections || []).map(insp => {
        const matchedAsset = (assetsData || []).find(a => String(a.id) === String(insp.asset_id)) || {};
        
        // Find user by email or fallback to raw user_email string
        const matchedStaff = (profilesData || []).find(p => 
          p.email?.toLowerCase() === insp.user_email?.toLowerCase() || 
          p.id === matchedAsset.assigned_to
        ) || {};

        return {
          ...insp,
          asset_name: matchedAsset.asset_name || matchedAsset.name || 'Unmapped Device',
          serial_number: matchedAsset.serial_number || matchedAsset.serial || 'S/N UNKNOWN',
          staff_name: matchedStaff.full_name || matchedStaff.name || insp.user_email || 'Remote Employee',
          emp_code: matchedStaff.emp_code || matchedStaff.emp_id || 'EMP-??',
        };
      });

      setInspections(masterLedger);
    } catch (err: any) {
      console.error("Admin fetch failed:", err);
      alert("Failed to fetch inspection records. Please check Supabase table permissions.");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 THE MAGIC "TWO-WAY" STATUS UPDATER
  const executeVerdict = async (inspectionId: string, assetId: string, verdict: 'Passed' | 'Failed (Re-Request)') => {
    if (!confirm(`Are you sure you want to mark this submission as "${verdict}"?`)) return;

    setUpdatingId(inspectionId);
    try {
      // 1. Update the Inspection record log
      await supabase
        .from('inspections')
        .update({ status: verdict })
        .eq('id', inspectionId);

      // 2. CRITICAL: Update the original Asset row so the Staff member's screen changes instantly!
      await supabase
        .from('assets')
        .update({ 
          inspection_status: verdict,
          status: 'Assigned', // Unlocks asset from "WAITING" mode
          last_inspection_date: new Date().toISOString()
        })
        .eq('id', assetId);

      // 3. Update local React UI state instantly without requiring a page refresh
      setInspections(prev => prev.map(item => 
        item.id === inspectionId ? { ...item, status: verdict } : item
      ));

      alert(`Verdict transmitted successfully! Staff screen updated to: ${verdict}`);
    } catch (err: any) {
      alert(`Error transmitting verdict: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter pipeline
  const filteredList = inspections.filter(item => {
    const matchesTab = 
      filterTab === 'all' ? true :
      filterTab === 'pending' ? item.status?.toLowerCase().includes('pending') :
      filterTab === 'approved' ? item.status?.toLowerCase().includes('pass') :
      filterTab === 'rejected' ? item.status?.toLowerCase().includes('fail') : true;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      item.staff_name.toLowerCase().includes(query) ||
      item.asset_name.toLowerCase().includes(query) ||
      item.serial_number.toLowerCase().includes(query) ||
      item.emp_code.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const pendingCount = inspections.filter(i => i.status?.toLowerCase().includes('pending')).length;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 font-sans">
      
      {/* COMMAND CENTER HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">Inspection Command Center</h1>
              {pendingCount > 0 && (
                <span className="px-3 py-0.5 bg-orange-500 text-white font-black text-xs rounded-full animate-bounce">
                  {pendingCount} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Verify smartphone visual captures, audit hardware health, and issue compliance certificates</p>
          </div>
        </div>

        <button 
          onClick={fetchVerificationLedger} 
          disabled={loading}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-50 hover:bg-gray-100 text-[#002B49] rounded-2xl text-xs font-black uppercase tracking-wider border border-gray-200 transition-all active:scale-95 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button onClick={() => setFilterTab('pending')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide shrink-0 transition-all ${filterTab === 'pending' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-500 hover:bg-gray-50'}`}>
            Pending Review ({pendingCount})
          </button>
          <button onClick={() => setFilterTab('approved')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide shrink-0 transition-all ${filterTab === 'approved' ? 'bg-green-600 text-white shadow-xs' : 'text-gray-500 hover:bg-gray-50'}`}>
            Approved
          </button>
          <button onClick={() => setFilterTab('rejected')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide shrink-0 transition-all ${filterTab === 'rejected' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-500 hover:bg-gray-50'}`}>
            Rejected
          </button>
          <button onClick={() => setFilterTab('all')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide shrink-0 transition-all ${filterTab === 'all' ? 'bg-[#002B49] text-white shadow-xs' : 'text-gray-500 hover:bg-gray-50'}`}>
            All Logs ({inspections.length})
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search employee, S/N, asset..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* SUBMISSION REVIEW FEED */}
      {loading ? (
        <div className="w-full py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002B49]"></div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Intercepting secure database payloads...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="w-full py-20 bg-white rounded-3xl border border-gray-100 text-center space-y-2">
          <ClipboardCheck size={40} className="mx-auto text-gray-300" />
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">No Inspection Logs Found</h3>
          <p className="text-xs text-gray-400 font-medium">There are no hardware submissions matching your current filter parameters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item) => {
            const isPending = item.status?.toLowerCase().includes('pending');
            const isApproved = item.status?.toLowerCase().includes('pass');
            const photoEntries = Object.entries(item.photos || {});

            return (
              <div 
                key={item.id} 
                className={`p-6 bg-white rounded-3xl border shadow-2xs transition-all ${
                  isPending ? 'border-orange-200/80 bg-gradient-to-r from-orange-50/20 via-white to-white' : 'border-gray-100'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  
                  {/* LEFT: EMPLOYEE & DEVICE INFO */}
                  <div className="space-y-3 min-w-[280px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 shrink-0">
                        <User size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-gray-900 leading-tight">{item.staff_name}</h3>
                        <p className="text-[11px] text-gray-400 font-bold font-mono mt-0.5">ID: {item.emp_code} | {item.user_email}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50/80 rounded-2xl border border-gray-100/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#002B49]">
                        <Laptop size={14} className="text-blue-600" />
                        <span>{item.asset_name}</span>
                      </div>
                      <p className="text-[11px] font-mono font-bold text-gray-500">S/N: {item.serial_number}</p>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                      <Clock size={13} />
                      <span>Submitted: {new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* MIDDLE: ATTACHED PERMANENT PHOTO THUMBNAILS & NOTES */}
                  <div className="flex-1 w-full lg:w-auto bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Employee Condition Declaration:</span>
                      <p className="text-xs text-gray-800 font-medium italic bg-white p-3 rounded-xl border border-gray-200/60 shadow-3xs leading-relaxed">
                        "{item.notes || 'No description provided by staff.'}"
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                        Captured Hardware Angles ({photoEntries.length}):
                      </span>
                      {photoEntries.length === 0 ? (
                        <p className="text-xs text-red-500 font-bold">⚠️ No images attached to payload.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2.5">
                          {photoEntries.map(([angle, url]: any) => (
                            <button
                              key={angle}
                              type="button"
                              onClick={() => setPreviewPhotoModal(url)}
                              className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 bg-white hover:border-blue-600 transition-all active:scale-95 cursor-pointer shadow-3xs"
                            >
                              <img src={url} alt={angle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1">
                                <Eye size={16} mb={0.5} />
                                <span className="text-[8px] font-black uppercase text-center leading-none">{angle.split(' ')[0]}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: VERDICT ACTION CONTROLS */}
                  <div className="flex lg:flex-col items-center justify-end gap-3 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                    {isPending ? (
                      <div className="flex flex-row lg:flex-col gap-2.5 w-full sm:w-auto">
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => executeVerdict(item.id, item.asset_id, 'Passed')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-green-600/20 transition-all cursor-pointer"
                        >
                          <CheckCircle2 size={16} />
                          <span>{updatingId === item.id ? 'Syncing...' : 'Approve Asset'}</span>
                        </button>
                        
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => executeVerdict(item.id, item.asset_id, 'Failed (Re-Request)')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-sm transition-all cursor-pointer"
                        >
                          <XCircle size={16} />
                          <span>Reject & Re-Try</span>
                        </button>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border font-black text-xs uppercase tracking-wider ${
                        isApproved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {isApproved ? <CheckCircle2 size={16} className="text-green-600"/> : <XCircle size={16} className="text-red-600"/>}
                        <span>{item.status}</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔍 HIGH-RES LIGHTBOX MODAL VIEWER */}
      {previewPhotoModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => setPreviewPhotoModal(null)}
            className="absolute top-6 right-6 w-14 h-14 bg-gray-800 hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl"
          >
            <X size={24} />
          </button>
          
          <div className="max-w-5xl max-h-[85vh] w-full h-full flex flex-col items-center justify-center p-2">
            <img 
              src={previewPhotoModal} 
              alt="Hardware High-Res Verification" 
              className="max-w-full max-h-full object-contain rounded-2xl border border-gray-700 shadow-2xl" 
            />
          </div>
          
          <span className="text-xs font-mono font-bold text-gray-400 mt-4 bg-gray-900 px-4 py-2 rounded-xl border border-gray-800">
            SECURE PUBLIC STORAGE BUCKET REF: {previewPhotoModal.split('/').pop()}
          </span>
        </div>
      )}

    </div>
  );
}