'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, ClipboardCheck, CheckCircle2, XCircle, Clock, 
  Eye, Laptop, User, Calendar, ShieldAlert, Search, RefreshCw, X, Image as ImageIcon
} from 'lucide-react';

function AdminInspectionReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedId = searchParams.get('id'); 

  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 're-inspection' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  useEffect(() => {
    fetchVerificationLedger();
  }, []);

  useEffect(() => {
    if (highlightedId && !loading && inspections.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`inspection-${highlightedId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100); 
    }
  }, [highlightedId, loading, inspections]);

  const fetchVerificationLedger = async () => {
    setLoading(true);
    try {
      const [inspRes, assetsRes, profilesRes] = await Promise.all([
        supabase.from('inspections').select('*').order('created_at', { ascending: false }),
        supabase.from('assets').select('*'),
        supabase.from('profiles').select('*')
      ]);

      const rawInspections = inspRes.data || [];
      const assetsData = assetsRes.data || [];
      const profilesData = profilesRes.data || [];

      const masterLedger: any[] = [];
      const processedAssetIds = new Set();

      rawInspections.forEach(insp => {
        const matchedAsset = assetsData.find(a => String(a.id) === String(insp.asset_id)) || {};
        const matchedStaff = profilesData.find(p => p.email?.toLowerCase() === insp.user_email?.toLowerCase() || p.id === matchedAsset.assigned_to || p.id === insp.inspected_by) || {};

        processedAssetIds.add(String(matchedAsset.id));

        const normalizedStatus = insp.status === 'Pending Review' || !insp.status ? 'Pending' : insp.status;
        const itemIdentifier = insp.id || `insp-${insp.asset_id}`;

        masterLedger.push({
          ...insp,
          id: itemIdentifier,
          is_submission: true,
          staff_id: matchedStaff.id,
          asset_name: matchedAsset.name || matchedAsset.asset_name || 'Unmapped Device',
          category: matchedAsset.category || 'Laptop', 
          serial_number: matchedAsset.serial_number || matchedAsset.serial || 'S/N UNKNOWN',
          asset_tag: matchedAsset.asset_tag || 'NO-TAG',
          staff_name: matchedStaff.full_name || matchedStaff.name || insp.user_email || 'Remote Employee',
          emp_code: matchedStaff.emp_code || matchedStaff.emp_id || 'EMP-??',
          status: normalizedStatus
        });
      });

      assetsData.forEach(asset => {
        const s = (asset.inspection_status || '').toLowerCase();
        
        if (s.includes('pending') || s.includes('overdue') || s.includes('re-inspection')) {
          if (!processedAssetIds.has(String(asset.id))) {
            const matchedStaff = profilesData.find(p => p.id === asset.assigned_to) || {};
            
            masterLedger.push({
              id: `missing-${asset.id}`,
              asset_id: asset.id,
              is_submission: false, 
              staff_id: matchedStaff.id,
              created_at: asset.created_at || new Date().toISOString(),
              asset_name: asset.name || asset.asset_name,
              category: asset.category || 'Laptop', 
              serial_number: asset.serial_number || asset.serial,
              asset_tag: asset.asset_tag || 'NO-TAG',
              staff_name: matchedStaff.full_name || matchedStaff.name || 'Unassigned',
              emp_code: matchedStaff.emp_code || matchedStaff.emp_id || 'N/A',
              status: 'Awaiting Staff Action',
              notes: 'Staff member has not submitted the smartphone visual inspection yet.',
              photos: []
            });
          }
        }
      });

      masterLedger.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setInspections(masterLedger);
    } catch (err: any) {
      console.error("Admin fetch failed:", err);
      alert("Failed to fetch inspection records.");
    } finally {
      setLoading(false);
    }
  };

  const executeVerdict = async (inspectionId: string, assetId: string, verdict: 'Approved' | 'Re-Inspection' | 'Rejected', staffId: string) => {
    let remarks = '';
    if (verdict === 'Re-Inspection' || verdict === 'Rejected') {
      remarks = prompt(`Provide administrative remarks/reason for marking this device as ${verdict}:`) || '';
      if (!remarks.trim()) return alert("Remarks are required to issue returned actions.");
    }

    if (!confirm(`Are you sure you want to mark this submission as "${verdict}"?`)) return;

    setUpdatingId(inspectionId);
    try {
      const isTemporaryId = String(inspectionId).startsWith('insp-') || !inspectionId;
      let query = supabase.from('inspections').update({ status: verdict, admin_remarks: remarks || null });
      
      if (isTemporaryId) {
        query = query.eq('asset_id', assetId).eq('status', 'Pending');
      } else {
        query = query.eq('id', inspectionId);
      }

      const { error: inspErr } = await query;
      if (inspErr) throw inspErr;

      const assetUpdatePayload: any = { inspection_status: verdict };
      if (verdict === 'Approved') {
        assetUpdatePayload.last_inspection_date = new Date().toISOString();
        assetUpdatePayload.status = 'Assigned'; 
      } else if (verdict === 'Re-Inspection') {
        assetUpdatePayload.status = 'Re-Inspection';
      } else {
        assetUpdatePayload.status = 'Action Required';
      }

      const { error: assetErr } = await supabase.from('assets').update(assetUpdatePayload).eq('id', assetId);
      if (assetErr) throw assetErr;

      if (staffId) {
        await supabase.from('notifications').insert({
          user_id: staffId,
          title: verdict === 'Approved' ? '✔ Inspection Approved' : `⚠ ${verdict} Action Required`,
          message: verdict === 'Approved' 
            ? `Your recent hardware audit has been approved.` 
            : `Audit returned: ${remarks}`,
          is_read: false,
          type: verdict === 'Approved' ? 'success' : 'warning'
        });
      }

      setInspections(prev => prev.map(item => item.id === inspectionId ? { ...item, status: verdict, admin_remarks: remarks || item.admin_remarks } : item));
      alert(`Success: Review locked in as ${verdict}.`);
    } catch (err: any) {
      alert(`Error transmitting verdict: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredList = inspections.filter(item => {
    const s = (item.status || '').toLowerCase().trim();
    const isApproved = s === 'approved' || s === 'pass';
    const isRejected = s === 'rejected' || s === 'fail';
    const isReInspect = s === 're-inspection';
    const isPending = s === 'pending';

    const matchesTab = 
      filterTab === 'all' ? true :
      filterTab === 'pending' ? isPending :
      filterTab === 'approved' ? isApproved :
      filterTab === 're-inspection' ? isReInspect :
      filterTab === 'rejected' ? isRejected : true;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (item.staff_name || '').toLowerCase().includes(query) ||
      (item.asset_name || '').toLowerCase().includes(query) ||
      (item.serial_number || '').toLowerCase().includes(query) ||
      (item.emp_code || '').toLowerCase().includes(query) ||
      (item.asset_tag || '').toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const pendingCount = inspections.filter(item => (item.status || '').toLowerCase().trim() === 'pending').length;

  const getSemanticColor = (status: string, isSubmission: boolean) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'approved') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s === 're-inspection') return 'text-amber-700 bg-amber-50 border-amber-200';
    if (s === 'rejected') return 'text-rose-700 bg-rose-50 border-rose-200';
    if (!isSubmission) return 'text-orange-700 bg-orange-50 border-orange-200'; 
    return 'text-blue-700 bg-blue-50 border-blue-200'; 
  };

  const calculateNextDueDate = (lastInspectionDate: string, category: string = 'Laptop') => {
    if (!lastInspectionDate) return 'N/A';
    const baseDate = new Date(lastInspectionDate);
    const isLaptop = (category || '').toLowerCase().includes('laptop');
    const monthsToAdd = isLaptop ? 1 : 3; 
    
    const lastDayOfTargetMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToAdd + 1, 0);
    const lastSaturday = new Date(lastDayOfTargetMonth);
    while (lastSaturday.getDay() !== 6) {
      lastSaturday.setDate(lastSaturday.getDate() - 1);
    }
    return lastSaturday.toLocaleDateString('en-IN'); 
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans text-slate-800 bg-slate-50/50 min-h-screen">
      
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 cursor-pointer transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Inspection Command Center</h1>
              {pendingCount > 0 && (
                <span className="px-3 py-1 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-sm">
                  {pendingCount} Pending Reviews
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold">Adjudicate smartphone hardware captures and enforce compliance</p>
          </div>
        </div>

        <button 
          onClick={fetchVerificationLedger} 
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Sync Database</span>
        </button>
      </div>

      {/* TABS & SEARCH */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {[
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'approved', label: 'Approved' },
            { id: 're-inspection', label: 'Re-Inspection' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'all', label: `All Logs (${inspections.length})` },
          ].map(tab => (
            <button
              key={tab.id} onClick={() => setFilterTab(tab.id as any)}
              className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shrink-0 cursor-pointer transition-all ${
                filterTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white p-2.5 rounded-3xl border border-slate-200 shadow-sm flex items-center">
          <div className="relative w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Employee, S/N, Asset Name, or Tag ID..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* ADJUDICATION GRID */}
      {loading ? (
        <div className="w-full py-32 flex flex-col items-center justify-center gap-4 text-slate-400">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
          <span className="text-[11px] font-black tracking-widest uppercase">Fetching Submissions...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="w-full py-24 bg-white rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
          <ClipboardCheck size={48} className="mx-auto text-slate-300" />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">No Logs Found</h3>
          <p className="text-xs text-slate-400 font-bold">Your queue is completely clear for this category.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredList.map((item) => {
            const isPending = item.status === 'Pending';
            const photosArray = Array.isArray(item.photos) ? item.photos : Object.values(item.photos || {});
            const isHighlighted = highlightedId === String(item.id);

            return (
              <div 
                key={item.id} 
                id={`inspection-${item.id}`}
                className={`p-6 md:p-8 bg-white rounded-3xl border shadow-sm transition-all flex flex-col xl:flex-row gap-8 ${
                  isHighlighted ? 'border-blue-500 ring-4 ring-blue-500/10 scale-[1.01]' : (isPending && item.is_submission) ? 'border-blue-200 shadow-blue-500/5' : 'border-slate-200 opacity-95'
                }`}
              >
                {/* LEFT COLUMN: Identity Metrics */}
                <div className="w-full xl:w-1/3 flex flex-col gap-6 shrink-0 border-b xl:border-b-0 xl:border-r border-slate-100 pb-6 xl:pb-0 xl:pr-8">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 border ${item.is_submission ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                      <User size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-lg font-black text-slate-900 leading-tight truncate" title={item.staff_name}>{item.staff_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.emp_code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                      <Laptop size={14} className="text-blue-600 shrink-0" />
                      <span className="truncate">{item.asset_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] border-t border-slate-200 pt-2 mt-2">
                      <span className="font-bold text-slate-400 uppercase tracking-widest">S/N:</span>
                      <span className="font-mono font-black text-slate-700">{item.serial_number}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-400 uppercase tracking-widest">TAG:</span>
                      <span className="font-mono font-black text-blue-600">{item.asset_tag}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={14} /> 
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {item.is_submission ? 'Submitted Date' : 'Last Inspection'}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-900">{new Date(item.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar size={14} /> 
                        <span className="text-[10px] font-black uppercase tracking-widest">Upcoming Due</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        {calculateNextDueDate(item.created_at, item.category)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Interactive Workspaces */}
                <div className="w-full xl:w-2/3 flex flex-col justify-between gap-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compliance Evaluation Workspace</h4>
                    <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getSemanticColor(item.status, item.is_submission)}`}>
                      {item.status === 'Pending' ? 'Ready For Review' : item.status}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><ImageIcon size={12}/> Photographic Evidence ({photosArray.length})</span>
                    {!item.is_submission ? (
                      <div className="p-4 rounded-xl border border-dashed border-orange-200 bg-orange-50 text-orange-700 text-xs font-bold flex items-center gap-2">
                        <Clock size={14} /> Awaiting staff to upload verification photos.
                      </div>
                    ) : photosArray.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-rose-200 bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-2">
                        <ShieldAlert size={14} /> No visual evidence was attached to this payload.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {photosArray.map((url: any, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewPhotoModal(url)}
                            className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 hover:border-blue-500 transition-all cursor-pointer shadow-sm"
                          >
                            <img src={url} alt={`Evidence Shot ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-sm">
                              <Eye size={20} className="mb-1" />
                              <span className="text-[9px] font-black uppercase tracking-widest px-1 text-center leading-tight">View Shot {idx + 1}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.is_submission ? 'Staff Condition Declaration' : 'System Note'}</span>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 font-medium italic leading-relaxed">
                      "{item.notes || 'No written declaration provided.'}"
                    </div>
                  </div>

                  {item.admin_remarks && (
                    <div className="p-4 bg-slate-100 rounded-2xl border border-slate-300 text-xs font-semibold">
                      <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block mb-1">Administrative Action Remarks:</span>
                      <p className="text-slate-800">"{item.admin_remarks}"</p>
                    </div>
                  )}

                  {/* BOTTOM HOOK CONTROLS */}
                  <div className="pt-4 border-t border-slate-100 mt-auto">
                    {!item.is_submission ? (
                       <div className="flex items-center justify-between px-5 py-4 bg-orange-50 rounded-xl border border-orange-200">
                         <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Pending Staff Action</span>
                         <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-orange-700">
                           <Clock size={14} /> Waiting on Employee
                         </div>
                       </div>
                    ) : isPending ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => executeVerdict(item.id, item.asset_id, 'Approved', item.staff_id)}
                          className="flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 size={16} /> {updatingId === item.id ? 'Syncing...' : 'Approve'}
                        </button>
                        
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => executeVerdict(item.id, item.asset_id, 'Re-Inspection', item.staff_id)}
                          className="flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw size={16} /> Re-Inspect
                        </button>

                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => executeVerdict(item.id, item.asset_id, 'Rejected', item.staff_id)}
                          className="flex items-center justify-center gap-2 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-5 py-4 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Adjudication Complete</span>
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest">
                          {item.status === 'Approved' && <CheckCircle2 size={14} className="text-emerald-600"/>}
                          {item.status === 'Re-Inspection' && <RefreshCw size={14} className="text-amber-600"/>}
                          {item.status === 'Rejected' && <XCircle size={14} className="text-rose-600"/>}
                          <span className={item.status === 'Approved' ? 'text-emerald-700' : item.status === 'Re-Inspection' ? 'text-amber-700' : 'text-rose-700'}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PHOTO LIGHTBOX */}
      {previewPhotoModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4 md:p-12 animate-in fade-in">
          <button 
            onClick={() => setPreviewPhotoModal(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all cursor-pointer border border-white/20"
          >
            <X size={20} />
          </button>
          
          <div className="max-w-6xl w-full h-full flex flex-col items-center justify-center">
            <img 
              src={previewPhotoModal} 
              alt="Hardware High-Res Verification" 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminInspectionReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
        <span className="text-[11px] font-black tracking-widest uppercase">Loading Core Engine...</span>
      </div>
    }>
      <AdminInspectionReviewContent />
    </Suspense>
  );
}