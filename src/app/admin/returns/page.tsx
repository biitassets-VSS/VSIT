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
  const [isDarkMode, setIsDarkMode] = useState(false);
  
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
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

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
                style: { background: isDarkMode ? '#18181b' : '#fff', color: isDarkMode ? '#fff' : '#000', fontWeight: 'bold' },
                iconTheme: { primary: '#ea580c', secondary: '#fff' },
              });
            });
            fetchData();
          }
        }
      } catch (err) {}
    }, 15000);
    return () => clearInterval(intervalId);
  }, [isDarkMode]);

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
      await supabase.from('assets').update({ status: 'Assigned' }).eq('id', request.id);
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

  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#F8FAFC]',
    card: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200/80',
    cardInner: isDarkMode ? 'bg-[#18181b] border-[#27272a]' : 'bg-slate-50 border-slate-200',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    modalBody: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-100',
    modalHeader: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-orange-50 border-orange-100',
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex flex-col items-center justify-center gap-3 transition-colors duration-300`}>
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
        <p className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Syncing Return Records...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-300`}>
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* STANDARDIZED HEADER */}
        <div className={`${theme.card} rounded-3xl p-6 sm:p-8 border shadow-sm space-y-6 transition-all duration-300 hover:shadow-md`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3 ${theme.textMain}`}>
                <LogOut className="text-orange-600" /> Asset Returns
              </h1>
              <p className={`text-sm font-semibold mt-2 ${theme.textSub}`}>
                Manage physical hardware handovers and view historical return logs.
              </p>
            </div>
            
            <Link 
              href="/admin" 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-x-1 shadow-sm shrink-0 hover:scale-105 active:scale-95 border ${isDarkMode ? 'bg-[#18181b] border-orange-500/30 text-orange-400 hover:bg-orange-500/10' : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200'}`}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </div>

          <div className={`flex items-center gap-2 border-b pb-2 ${isDarkMode ? 'border-[#27272a]' : 'border-slate-100'}`}>
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                activeTab === 'pending' 
                  ? (isDarkMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-md' : 'bg-orange-50 text-orange-700 border border-orange-200 shadow-sm') 
                  : `${theme.card} ${theme.textSub} hover:text-orange-600 hover:border-orange-400 border`
              }`}
            >
              <Clock size={16} /> Pending Actions
              {pendingRequests.length > 0 && <span className="bg-orange-600 text-white px-2 py-0.5 rounded-full text-[10px] animate-in zoom-in">{pendingRequests.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                activeTab === 'history' 
                  ? (isDarkMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-md' : 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm') 
                  : `${theme.card} ${theme.textSub} hover:text-purple-500 hover:border-purple-300 border`
              }`}
            >
              <History size={16} /> Processed History
            </button>
          </div>
        </div>

        {/* PENDING TAB CONTENT */}
        {activeTab === 'pending' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {pendingRequests.length === 0 ? (
              <div className={`${theme.card} rounded-3xl border py-16 text-center space-y-3 shadow-sm hover:shadow-md transition-all duration-300`}>
                <Package size={48} className={`mx-auto ${isDarkMode ? 'text-zinc-700' : 'text-orange-200'}`} />
                <p className={`font-bold ${theme.textSub}`}>No pending return requests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingRequests.map((request, index) => {
                  const staffName = request.user_profile?.full_name || request.user_profile?.name || 'Unknown User';
                  const staffEmpCode = request.user_profile?.emp_code || request.user_profile?.emp_id || 'NO-ID';

                  return (
                    <div key={`pending-${request.id || 'no-id'}-${index}`} className={`${theme.card} p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${isDarkMode ? 'hover:border-orange-500/50' : 'hover:border-orange-300'}`}>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>Action Required</span>
                          <h3 className={`font-extrabold text-lg leading-none ${theme.textMain}`}>{request.name || request.model}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs font-mono font-bold">
                          <span className={`px-2 py-1 rounded-md ${isDarkMode ? 'bg-[#18181b] text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>Tag: {request.asset_tag}</span>
                          <span className={`px-2 py-1 rounded-md ${isDarkMode ? 'bg-[#18181b] text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>S/N: {request.serial_number}</span>
                        </div>
                        <p className={`text-sm font-semibold mt-3 flex items-center gap-2 ${theme.textSub}`}>
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                          Returning User: <strong className={theme.textMain}>{staffName}</strong> ({staffEmpCode})
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={() => setModal({ isOpen: true, data: request, isHistory: false })} className={`flex-1 md:flex-none px-5 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 border cursor-pointer ${isDarkMode ? 'bg-[#18181b] border-purple-500/30 text-purple-400 hover:bg-purple-500/10' : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'}`}>
                          <ImageIcon size={16} /> Review
                        </button>
                        <button disabled={processingId === request.id} onClick={() => handleApproveReturn(request)} className="flex-1 md:flex-none px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm shadow-orange-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50">
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
              <div className={`${theme.card} rounded-3xl border py-16 text-center space-y-3 shadow-sm hover:shadow-md transition-all duration-300`}>
                <History size={48} className={`mx-auto ${isDarkMode ? 'text-zinc-700' : 'text-slate-300'}`} />
                <p className={`font-bold ${theme.textSub}`}>No historical records found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {historyRequests.map((record, index) => {
                  const staffName = record.user_profile?.full_name || record.user_profile?.name || 'Unknown User';
                  const isApproved = record.status === 'Return Approved';
                  const processDate = record.created_at ? new Date(record.created_at).toLocaleString() : 'Unknown Date';

                  return (
                    <div key={`history-${record.id || 'no-id'}-${index}`} className={`${theme.card} p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 opacity-90 ${isDarkMode ? 'hover:border-purple-500/50' : 'hover:border-purple-300'}`}>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md flex items-center gap-1.5 ${isApproved ? (isDarkMode ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200') : (isDarkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200')}`}>
                            {isApproved ? <CheckCircle size={12}/> : <XOctagon size={12}/>} {isApproved ? 'Handover Approved' : 'Return Rejected'}
                          </span>
                          <span className={`text-[10px] font-bold ${theme.textSub}`}>{processDate}</span>
                        </div>
                        <h3 className={`font-extrabold text-base mt-2 ${theme.textMain}`}>{record.asset?.name || record.asset?.model || 'Hardware Device'}</h3>
                        <p className={`text-xs font-mono font-bold mt-1 ${theme.textSub}`}>Asset Tag: {record.asset?.asset_tag || 'N/A'}</p>
                        
                        <p className={`text-sm font-semibold mt-3 ${theme.textSub}`}>
                          Returned by: <strong className={theme.textMain}>{staffName}</strong> 
                        </p>
                      </div>

                      <div className="w-full md:w-auto">
                        <button onClick={() => setModal({ isOpen: true, data: record, isHistory: true })} className={`w-full md:w-auto px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 border cursor-pointer ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-300 hover:text-white hover:border-purple-500/50' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 ${theme.modalBody}`}>
            <div className={`p-6 border-b flex items-center justify-between shrink-0 ${modal.isHistory ? (isDarkMode ? 'bg-[#18181b] border-[#27272a]' : 'bg-purple-50 border-purple-100') : (isDarkMode ? 'bg-[#18181b] border-[#27272a]' : 'bg-orange-50 border-orange-100')}`}>
              <h3 className={`font-extrabold text-sm tracking-widest uppercase flex items-center gap-2 ${modal.isHistory ? (isDarkMode ? 'text-purple-400' : 'text-purple-900') : (isDarkMode ? 'text-orange-400' : 'text-orange-900')}`}>
                {modal.isHistory ? <History size={16} className={isDarkMode ? "text-purple-500" : "text-purple-600"}/> : <Search size={16} className={isDarkMode ? "text-orange-500" : "text-orange-600"}/>} 
                {modal.isHistory ? 'Historical Return Log' : 'Review Pending Return'}
              </h3>
              <button onClick={() => setModal({ isOpen: false, data: null, isHistory: false })} className={`p-2 rounded-full transition-all hover:scale-110 cursor-pointer ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-white/50 text-slate-500'}`}><XCircle size={20}/></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              <div className={`p-5 rounded-2xl border ${theme.cardInner}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${theme.textSub}`}>Transaction Notes & Reasons</p>
                <p className={`text-sm font-semibold whitespace-pre-wrap ${theme.textMain}`}>
                  {modal.isHistory 
                    ? (modal.data.notes || "No notes logged for this transaction.") 
                    : (modal.data.return_details?.notes || "No additional notes provided by staff.")}
                </p>
              </div>

              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 ${theme.textSub}`}><Camera size={14}/> Mobile Handoff Photos</p>
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
                      <div className="grid grid-cols-2 gap-4">
                        {photosArray.map((url: string, i: number) => (
                          <img key={`photo-${i}`} src={url} alt={`Evidence ${i}`} className={`w-full h-48 object-cover rounded-2xl border shadow-sm transition-transform duration-300 hover:scale-[1.02] cursor-pointer ${isDarkMode ? 'border-[#3f3f46]' : 'border-slate-200'}`} />
                        ))}
                      </div>
                    );
                  }
                  
                  return (
                     <div className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center ${isDarkMode ? 'border-[#27272a] bg-[#121212] text-zinc-500' : 'border-slate-200 bg-slate-50/50 text-slate-400'}`}>
                       <AlertTriangle size={32} className="mb-2 opacity-50" />
                       <p className="text-sm font-bold">No visual evidence uploaded.</p>
                     </div>
                  );
                })()}
              </div>
            </div>

            {!modal.isHistory && (
              <div className={`p-6 border-t flex justify-between gap-4 shrink-0 ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-slate-50 border-slate-200'}`}>
                <button onClick={() => handleRejectReturn(modal.data)} className={`flex-1 py-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border ${isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' : 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100'}`}>
                  Reject Return
                </button>
                <button onClick={() => handleApproveReturn(modal.data)} className="flex-[2] py-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer">
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