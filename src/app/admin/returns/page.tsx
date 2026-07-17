'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle2, XCircle, Loader2, LogOut, Package, 
  Image as ImageIcon, Search, AlertTriangle, History,
  Clock, XOctagon, CheckCircle, ChevronRight
} from 'lucide-react';

export default function AdminReturnsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [historyRequests, setHistoryRequests] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [modal, setModal] = useState<{ isOpen: boolean; data: any; isHistory: boolean }>({
    isOpen: false,
    data: null,
    isHistory: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: returnInspections } = await supabase
        .from('inspections')
        .select('*')
        .ilike('notes', '%[RETURN REQUEST]%')
        .not('status', 'in', '("Return Approved","Return Rejected")');

      const { data: returnAssets } = await supabase
        .from('assets')
        .select('*')
        .ilike('status', '%Return%');

      const combinedAssetIds = Array.from(new Set([
        ...(returnAssets?.map(a => String(a.id)) || []),
        ...(returnInspections?.map(i => String(i.asset_id)) || [])
      ]));

      let pendInspections = returnInspections || [];
      if (combinedAssetIds.length > 0) {
        const { data: moreInsps } = await supabase.from('inspections').select('*').in('asset_id', combinedAssetIds).order('created_at', { ascending: false });
        pendInspections = moreInsps || [];
      }

      const { data: finalPendingAssets } = await supabase.from('assets').select('*').in('id', combinedAssetIds);
      const pendUserIds = [...new Set(finalPendingAssets?.map(a => a.assigned_to).filter(Boolean))];
      let pendProfiles: any[] = [];
      if (pendUserIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('id', pendUserIds);
        pendProfiles = profs || [];
      }

      const compiledPending = (finalPendingAssets || []).map(asset => ({
        ...asset,
        return_details: pendInspections.find(i => String(i.asset_id) === String(asset.id)) || null,
        user_profile: pendProfiles.find(p => p.id === asset.assigned_to) || null
      }));

      setPendingRequests(compiledPending);

      const { data: historyInsps } = await supabase
        .from('inspections')
        .select('*')
        .in('status', ['Return Approved', 'Return Rejected']) 
        .order('created_at', { ascending: false });

      const histAssetIds = [...new Set(historyInsps?.map(i => String(i.asset_id)).filter(Boolean))];
      const histUserIds = [...new Set(historyInsps?.map(i => i.inspected_by).filter(Boolean))];

      let histAssets: any[] = [];
      let histProfiles: any[] = [];

      if (histAssetIds.length > 0) {
        const { data: a } = await supabase.from('assets').select('*').in('id', histAssetIds);
        histAssets = a || [];
      }
      if (histUserIds.length > 0) {
        const { data: p } = await supabase.from('profiles').select('*').in('id', histUserIds);
        histProfiles = p || [];
      }

      const compiledHistory = (historyInsps || []).map(insp => ({
        ...insp, 
        asset: histAssets.find(a => String(a.id) === String(insp.asset_id)) || { name: 'Unknown Asset', asset_tag: 'N/A' },
        user_profile: histProfiles.find(p => p.id === insp.inspected_by) || null
      }));

      setHistoryRequests(compiledHistory);

    } catch (error) {
      console.error('Error fetching return data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveReturn = async (request: any) => {
    if (!window.confirm("Confirm physical asset received? This will log the return, unassign the device from the staff member, and return it to stock.")) return;
    
    setProcessingId(request.id);
    try {
      await supabase.from('assets').update({ 
        assigned_to: null, 
        status: 'In Stock (Available)' 
      }).eq('id', request.id);

      if (request.return_details?.id) {
        await supabase.from('inspections').update({ 
          status: 'Return Approved', 
          notes: `${request.return_details.notes || ''}\n[ADMIN APPROVED: Asset returned to Stock]` 
        }).eq('id', request.return_details.id);
      } else {
        await supabase.from('inspections').insert({
          asset_id: request.id, 
          inspected_by: request.assigned_to, 
          status: 'Return Approved', 
          notes: 'Approved via Admin Dashboard. Asset returned to Stock.'
        });
      }

      setModal({ isOpen: false, data: null, isHistory: false });
      fetchData(); 
    } catch (error: any) {
      alert(`Error approving return: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReturn = async (request: any) => {
    const reason = window.prompt("Enter reason for rejection (e.g., Asset missing, unresolved damage):");
    if (reason === null) return;

    setProcessingId(request.id);
    try {
      await supabase.from('assets').update({ status: 'In Use' }).eq('id', request.id);

      if (request.return_details?.id) {
        await supabase.from('inspections').update({ 
          status: 'Return Rejected', 
          notes: `${request.return_details.notes || ''}\n[ADMIN REJECTED: ${reason}]` 
        }).eq('id', request.return_details.id);
      } else {
        await supabase.from('inspections').insert({
          asset_id: request.id, 
          inspected_by: request.assigned_to, 
          status: 'Return Rejected', 
          notes: `Admin Rejected: ${reason}`
        });
      }

      setModal({ isOpen: false, data: null, isHistory: false });
      fetchData();
    } catch (error: any) {
      alert(`Error rejecting return: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const approvedRequests = historyRequests.filter(r => r.status === 'Return Approved');
  const rejectedRequests = historyRequests.filter(r => r.status === 'Return Rejected');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Syncing Return Records...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Modern Header & Tabs Block */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                  <LogOut size={24} /> 
                </div>
                Asset Returns
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-2">
                Manage physical hardware handovers and view historical return logs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-0">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'pending' ? 'border-orange-500 text-orange-700 bg-orange-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-t-xl'}`}
            >
              <Clock size={16} /> Pending Actions
              {pendingRequests.length > 0 && <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] shadow-sm animate-pulse">{pendingRequests.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('approved')}
              className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'approved' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-t-xl'}`}
            >
              <CheckCircle size={16} /> Approved History
            </button>
            <button 
              onClick={() => setActiveTab('rejected')}
              className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'rejected' ? 'border-rose-500 text-rose-700 bg-rose-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-t-xl'}`}
            >
              <XOctagon size={16} /> Rejected Requests
            </button>
          </div>
        </div>

        {/* PENDING TAB */}
        {activeTab === 'pending' && (
          <div className="animate-in fade-in duration-300">
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center space-y-3 shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Pending Returns</p>
                <p className="text-xs text-slate-400 font-medium">All hardware handovers have been processed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {pendingRequests.map((request, index) => {
                  const staffName = request.user_profile?.full_name || request.user_profile?.name || 'Unknown User';
                  const staffEmpCode = request.user_profile?.emp_code || request.user_profile?.emp_id || 'NO-ID';

                  return (
                    <div key={`pending-${request.id || 'no-id'}-${index}`} className="bg-white p-5 md:p-6 rounded-3xl border border-orange-200/60 shadow-sm hover:shadow-md hover:border-orange-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-100 text-[9px] font-black uppercase tracking-widest rounded-md">Action Required</span>
                          <h3 className="font-extrabold text-lg text-slate-900 truncate pr-4">{request.name || request.model}</h3>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg shadow-2xs">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Tag</span>
                            <span className="text-[11px] font-mono font-bold text-slate-700">{request.asset_tag}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg shadow-2xs">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">S/N</span>
                            <span className="text-[11px] font-mono font-bold text-slate-700 break-all">{request.serial_number}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-orange-50/50 inline-flex px-3 py-1.5 rounded-lg border border-orange-100/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                          Returning User: <span className="text-slate-900 font-bold">{staffName}</span> <span className="text-slate-400">({staffEmpCode})</span>
                        </div>
                      </div>

                      <div className="shrink-0 w-full md:w-auto flex justify-end md:justify-center border-t border-slate-100 md:border-t-0 pt-4 md:pt-0">
                        {/* 🌟 FIX: Only Review Button is available here to force them into the modal 🌟 */}
                        <button 
                          onClick={() => setModal({ isOpen: true, data: request, isHistory: false })} 
                          className="w-full md:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2 group-hover:bg-indigo-600"
                        >
                          <Search size={16} /> Review & Process
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* APPROVED HISTORY TAB */}
        {activeTab === 'approved' && (
          <div className="animate-in fade-in duration-300">
            {approvedRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center space-y-3 shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <History size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Approved History</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {approvedRequests.map((record, index) => {
                  const staffName = record.user_profile?.full_name || record.user_profile?.name || 'Unknown User';
                  const processDate = record.created_at ? new Date(record.created_at).toLocaleString() : 'Unknown Date';

                  return (
                    <div key={`history-app-${record.id || 'no-id'}-${index}`} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle size={12}/> Handover Approved
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {processDate}</span>
                        </div>
                        <h3 className="font-extrabold text-lg text-slate-900 truncate mb-2">{record.asset?.name || record.asset?.model || 'Hardware Device'}</h3>
                        
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg shadow-2xs inline-flex mb-3">
                           <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Tag</span>
                           <span className="text-[11px] font-mono font-bold text-slate-700">{record.asset?.asset_tag || 'N/A'}</span>
                        </div>
                        
                        <p className="text-xs font-semibold text-slate-600">
                          Returned by: <strong className="text-slate-900">{staffName}</strong> 
                        </p>
                      </div>

                      <div className="shrink-0 w-full md:w-auto border-t border-slate-100 md:border-t-0 pt-4 md:pt-0">
                        <button onClick={() => setModal({ isOpen: true, data: record, isHistory: true })} className="w-full md:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-colors shadow-sm">
                          <Search size={14} /> View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* REJECTED REQUESTS TAB */}
        {activeTab === 'rejected' && (
          <div className="animate-in fade-in duration-300">
            {rejectedRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center space-y-3 shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <History size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Rejected Returns</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {rejectedRequests.map((record, index) => {
                  const staffName = record.user_profile?.full_name || record.user_profile?.name || 'Unknown User';
                  const processDate = record.created_at ? new Date(record.created_at).toLocaleString() : 'Unknown Date';

                  return (
                    <div key={`history-rej-${record.id || 'no-id'}-${index}`} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-rose-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100">
                            <XOctagon size={12}/> Return Rejected
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {processDate}</span>
                        </div>
                        <h3 className="font-extrabold text-lg text-slate-900 truncate mb-2">{record.asset?.name || record.asset?.model || 'Hardware Device'}</h3>
                        
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg shadow-2xs inline-flex mb-3">
                           <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Tag</span>
                           <span className="text-[11px] font-mono font-bold text-slate-700">{record.asset?.asset_tag || 'N/A'}</span>
                        </div>
                        
                        <p className="text-xs font-semibold text-slate-600">
                          Returned by: <strong className="text-slate-900">{staffName}</strong> 
                        </p>
                      </div>

                      <div className="shrink-0 w-full md:w-auto border-t border-slate-100 md:border-t-0 pt-4 md:pt-0">
                        <button onClick={() => setModal({ isOpen: true, data: record, isHistory: true })} className="w-full md:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-colors shadow-sm">
                          <Search size={14} /> View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* UNIVERSAL REVIEW MODAL (WITH DEEP PHOTO EXTRACTION) */}
      {/* ========================================== */}
      {modal.isOpen && modal.data && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
                {modal.isHistory ? <History size={16} className="text-blue-600"/> : <Search size={16} className="text-orange-600"/>} 
                {modal.isHistory ? 'Historical Return Log' : 'Review & Process Return'}
              </h3>
              <button onClick={() => setModal({ isOpen: false, data: null, isHistory: false })} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"><XCircle size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><ImageIcon size={14} /> Transaction Notes & Reasons</p>
                <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {modal.isHistory 
                    ? (modal.data.notes || "No notes logged for this transaction.") 
                    : (modal.data.return_details?.notes || "No additional notes provided by staff.")}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Camera size={14}/> Mobile Handoff Photos</p>
                {(() => {
                  const inspectionTarget = modal.isHistory ? modal.data : modal.data.return_details;
                  let rawPhotos = inspectionTarget?.photos 
                               || inspectionTarget?.photo_urls 
                               || inspectionTarget?.photo_url 
                               || inspectionTarget?.image_url
                               || inspectionTarget?.images
                               || inspectionTarget?.photo
                               || inspectionTarget?.image;
                  
                  let photosArray: string[] = [];

                  try {
                    if (!rawPhotos) {
                      photosArray = [];
                    } else if (Array.isArray(rawPhotos)) {
                      photosArray = rawPhotos;
                    } else if (typeof rawPhotos === 'string') {
                      const trimmed = rawPhotos.trim();
                      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                        const parsed = JSON.parse(trimmed);
                        if (Array.isArray(parsed)) photosArray = parsed;
                        else if (typeof parsed === 'object' && parsed !== null) photosArray = Object.values(parsed);
                      } else if (trimmed !== '') {
                        photosArray = [trimmed]; 
                      }
                    } else if (typeof rawPhotos === 'object' && rawPhotos !== null) {
                      photosArray = Object.values(rawPhotos);
                    }
                  } catch (e) {
                    if (typeof rawPhotos === 'string' && rawPhotos.startsWith('http')) {
                      photosArray = [rawPhotos.trim()];
                    }
                  }
                  
                  if (photosArray.length > 0) {
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {photosArray.map((url: string, i: number) => (
                          <div key={`photo-${i}`} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm cursor-zoom-in">
                             <img src={url} alt={`Evidence ${i}`} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" onClick={() => window.open(url, '_blank')} />
                             <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest pointer-events-none">Shot {i+1}</div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  
                  return (
                     <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                       <AlertTriangle size={32} className="mb-3 opacity-30" />
                       <p className="text-xs font-bold uppercase tracking-widest">No visual evidence uploaded.</p>
                     </div>
                  );
                })()}
              </div>
            </div>

            {!modal.isHistory && (
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                <button 
                  disabled={processingId === modal.data.id}
                  onClick={() => handleRejectReturn(modal.data)} 
                  className="px-6 py-3.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === modal.data.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Reject Return
                </button>
                <button 
                  disabled={processingId === modal.data.id}
                  onClick={() => handleApproveReturn(modal.data)} 
                  className="px-8 py-3.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingId === modal.data.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Approve & Unassign
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}