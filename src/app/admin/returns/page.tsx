'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { 
  CheckCircle2, XCircle, Loader2, LogOut, Package, 
  Image as ImageIcon, Search, AlertTriangle, History,
  Clock, XOctagon, CheckCircle, Camera, ArrowLeft
} from 'lucide-react';

export default function AdminReturnsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [historyRequests, setHistoryRequests] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [modal, setModal] = useState<{ isOpen: boolean; data: any; isHistory: boolean }>({
    isOpen: false,
    data: null,
    isHistory: false
  });

  const pendingIdsRef = useRef<string[]>([]);

  useEffect(() => {
    pendingIdsRef.current = pendingRequests.map(req => req.id);
  }, [pendingRequests]);

  const fetchData = async () => {
    if (pendingRequests.length === 0 && historyRequests.length === 0) {
      setLoading(true);
    }
    try {
      const { data: pendingAssets } = await supabase
        .from('assets')
        .select('*')
        .eq('status', 'Return Requested');

      const pendAssetIds = pendingAssets?.map(a => a.id) || [];
      const pendUserIds = [...new Set(pendingAssets?.map(a => a.assigned_to).filter(Boolean))];
      
      let pendInspections: any[] = [];
      let pendProfiles: any[] = [];

      if (pendAssetIds.length > 0) {
        const { data: insps } = await supabase.from('inspections').select('*').in('asset_id', pendAssetIds).order('created_at', { ascending: false });
        pendInspections = insps || [];
      }
      
      if (pendUserIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('id', pendUserIds);
        pendProfiles = profs || [];
      }

      const compiledPending = (pendingAssets || []).map(asset => ({
        ...asset,
        return_details: pendInspections.find(i => i.asset_id === asset.id) || null,
        user_profile: pendProfiles.find(p => p.id === asset.assigned_to) || null
      }));

      setPendingRequests(compiledPending);

      const { data: historyInsps } = await supabase
        .from('inspections')
        .select('*')
        .in('status', ['Return Approved', 'Return Rejected']) 
        .order('created_at', { ascending: false });

      const histAssetIds = [...new Set(historyInsps?.map(i => i.asset_id).filter(Boolean))];
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
        asset: histAssets.find(a => a.id === insp.asset_id) || { name: 'Unknown Asset', asset_tag: 'N/A' },
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
    const intervalId = setInterval(async () => {
      try {
        const { data: latestPending } = await supabase.from('assets').select('id, name, model').eq('status', 'Return Requested');
        if (latestPending) {
          const currentIds = pendingIdsRef.current;
          const newRequests = latestPending.filter(asset => !currentIds.includes(asset.id));
          if (newRequests.length > 0) {
            newRequests.forEach(asset => {
              toast.success(`New return request received for ${asset.name || asset.model}!`, {
                duration: 6000, position: 'top-right',
                style: { background: '#1e293b', color: '#fff', fontWeight: 'bold' },
                iconTheme: { primary: '#ea580c', secondary: '#fff' },
              });
            });
            fetchData();
          }
        }
      } catch (err) {}
    }, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const handleApproveReturn = async (request: any) => {
    if (!window.confirm("Confirm physical asset received? This will log the return and unassign the device.")) return;
    setProcessingId(request.id);
    try {
      await supabase.from('assets').update({ assigned_to: null, status: 'In Stock' }).eq('id', request.id);
      if (request.return_details?.id) {
        await supabase.from('inspections').update({ status: 'Return Approved', notes: `${request.return_details.notes || ''}\n[ADMIN APPROVED]` }).eq('id', request.return_details.id);
      } else {
        await supabase.from('inspections').insert({ asset_id: request.id, inspected_by: request.assigned_to, status: 'Return Approved', notes: 'Approved via Admin Dashboard (No mobile photos provided)' });
      }
      setModal({ isOpen: false, data: null, isHistory: false });
      toast.success('Return approved successfully.');
      fetchData(); 
    } catch (error: any) {
      toast.error(`Error approving return: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReturn = async (request: any) => {
    const reason = window.prompt("Enter reason for rejection:");
    if (reason === null) return;
    setProcessingId(request.id);
    try {
      await supabase.from('assets').update({ status: 'Active' }).eq('id', request.id);
      if (request.return_details?.id) {
        await supabase.from('inspections').update({ status: 'Return Rejected', notes: `${request.return_details.notes || ''}\n[ADMIN REJECTED: ${reason}]` }).eq('id', request.return_details.id);
      } else {
        await supabase.from('inspections').insert({ asset_id: request.id, inspected_by: request.assigned_to, status: 'Return Rejected', notes: `Admin Rejected: ${reason}` });
      }
      setModal({ isOpen: false, data: null, isHistory: false });
      toast.success('Return rejected.');
      fetchData();
    } catch (error: any) {
      toast.error(`Error rejecting return: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Syncing Return Records...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* STANDARDIZED HEADER */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 transition-all duration-300 hover:shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                <LogOut className="text-orange-600" /> Asset Returns
              </h1>
              <p className="text-sm font-semibold text-slate-500 mt-2">
                Manage physical hardware handovers and view historical return logs.
              </p>
            </div>
            
            <Link 
              href="/admin" 
              className="px-5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-x-1 hover:shadow-sm shrink-0"
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'pending' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Clock size={16} /> Pending Actions
              {pendingRequests.length > 0 && <span className="bg-orange-600 text-white px-2 py-0.5 rounded-full text-[10px]">{pendingRequests.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <History size={16} /> Processed History
            </button>
          </div>
        </div>

        {/* PENDING TAB CONTENT */}
        {activeTab === 'pending' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center space-y-3 shadow-sm hover:shadow-md transition-all">
                <Package size={48} className="mx-auto text-slate-300" />
                <p className="text-slate-500 font-bold">No pending return requests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingRequests.map((request, index) => {
                  const staffName = request.user_profile?.full_name || request.user_profile?.name || 'Unknown User';
                  const staffEmpCode = request.user_profile?.emp_code || request.user_profile?.emp_id || 'NO-ID';

                  return (
                    <div key={`pending-${request.id || 'no-id'}-${index}`} className="bg-white p-6 rounded-2xl border border-orange-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-orange-300 transition-all duration-300">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black uppercase rounded-md">Action Required</span>
                          <h3 className="font-bold text-lg text-slate-900 leading-none">{request.name || request.model}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-500">
                          <span className="bg-slate-100 px-2 py-1 rounded-md">Tag: {request.asset_tag}</span>
                          <span className="bg-slate-100 px-2 py-1 rounded-md">S/N: {request.serial_number}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-600 mt-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                          Returning User: <strong className="text-slate-900">{staffName}</strong> ({staffEmpCode})
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={() => setModal({ isOpen: true, data: request, isHistory: false })} className="flex-1 md:flex-none px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95">
                          <ImageIcon size={16} /> Review
                        </button>
                        <button disabled={processingId === request.id} onClick={() => handleApproveReturn(request)} className="flex-1 md:flex-none px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                          {processingId === request.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Approve Handover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB CONTENT */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {historyRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center space-y-3 shadow-sm hover:shadow-md transition-all">
                <History size={48} className="mx-auto text-slate-300" />
                <p className="text-slate-500 font-bold">No historical records found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {historyRequests.map((record, index) => {
                  const staffName = record.user_profile?.full_name || record.user_profile?.name || 'Unknown User';
                  const isApproved = record.status === 'Return Approved';
                  const processDate = record.created_at ? new Date(record.created_at).toLocaleString() : 'Unknown Date';

                  return (
                    <div key={`history-${record.id || 'no-id'}-${index}`} className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-purple-300 transition-all duration-300 opacity-90">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md flex items-center gap-1 ${isApproved ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {isApproved ? <CheckCircle size={12}/> : <XOctagon size={12}/>} {isApproved ? 'Handover Approved' : 'Return Rejected'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">{processDate}</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 mt-2">{record.asset?.name || record.asset?.model || 'Hardware Device'}</h3>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">Asset Tag: {record.asset?.asset_tag || 'N/A'}</p>
                        
                        <p className="text-sm font-semibold text-slate-600 mt-2">
                          Returned by: <strong className="text-slate-900">{staffName}</strong> 
                        </p>
                      </div>

                      <div className="w-full md:w-auto">
                        <button onClick={() => setModal({ isOpen: true, data: record, isHistory: true })} className="w-full md:w-auto px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95">
                          <Search size={16} /> View Log Details
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

      {/* UNIVERSAL REVIEW MODAL */}
      {modal.isOpen && modal.data && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className={`p-6 border-b flex items-center justify-between shrink-0 ${modal.isHistory ? 'bg-purple-50 border-purple-100' : 'bg-orange-50 border-orange-100'}`}>
              <h3 className={`font-extrabold text-sm tracking-tight uppercase flex items-center gap-2 ${modal.isHistory ? 'text-purple-900' : 'text-orange-900'}`}>
                {modal.isHistory ? <History size={16} className="text-purple-600"/> : <Search size={16} className="text-orange-600"/>} 
                {modal.isHistory ? 'Historical Return Log' : 'Review Pending Return'}
              </h3>
              <button onClick={() => setModal({ isOpen: false, data: null, isHistory: false })} className="p-2 rounded-full hover:bg-white/50 transition-all hover:scale-110"><XCircle size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Transaction Notes & Reasons</p>
                <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">
                  {modal.isHistory 
                    ? (modal.data.notes || "No notes logged for this transaction.") 
                    : (modal.data.return_details?.notes || "No additional notes provided by staff.")}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Camera size={14}/> Mobile Handoff Photos</p>
                {(() => {
                  let rawPhotos = modal.isHistory ? modal.data.photos : modal.data.return_details?.photos;
                  let photosArray: string[] = [];

                  try {
                    if (Array.isArray(rawPhotos)) {
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
                          <img key={`photo-${i}`} src={url} alt={`Evidence ${i}`} className="w-full h-48 object-cover rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]" />
                        ))}
                      </div>
                    );
                  }
                  
                  return (
                     <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                       <AlertTriangle size={32} className="mb-2 opacity-50" />
                       <p className="text-sm font-bold">No visual evidence uploaded.</p>
                     </div>
                  );
                })()}
              </div>
            </div>

            {!modal.isHistory && (
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between gap-3 shrink-0">
                <button onClick={() => handleRejectReturn(modal.data)} className="px-6 py-3 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all hover:scale-105 active:scale-95">
                  Reject Return
                </button>
                <button onClick={() => handleApproveReturn(modal.data)} className="px-8 py-3 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-all hover:scale-105 active:scale-95">
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