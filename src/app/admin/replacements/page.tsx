'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ArrowLeft, ArrowRightLeft, CheckCircle2, XCircle, Clock, 
  Eye, Laptop, User, Calendar, ShieldAlert, Search, RefreshCw, 
  X, History as HistoryIcon, FilterX, ExternalLink, Settings, Send, 
  ShieldCheck, Check, AlertTriangle, Package, Monitor, ArrowRight,
  ChevronDown, ChevronUp
} from 'lucide-react';

// Safe date formatter
function safeDate(dateStr: any) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function safeString(val: any) {
  if (val === null || val === undefined) return '';
  return String(val);
}

function AdminReplacementsContent() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [historyRequests, setHistoryRequests] = useState<any[]>([]);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);
  
  const [modal, setModal] = useState<{ isOpen: boolean; data: any }>({
    isOpen: false,
    data: null
  });
  const [selectedReplacementId, setSelectedReplacementId] = useState<string>('');

  useEffect(() => {
    // Enforce the matte glass theme by removing dark mode interference
    document.documentElement.classList.remove('dark');

    fetchData();

    // 🌟 REAL-TIME SUPABASE ALERT LISTENER FOR NEW REPLACEMENTS
    const replacementChannel = supabase
      .channel('replacements-live-alerts')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, (payload) => {
        const newAsset = payload.new;
        const oldAsset = payload.old;
        if (newAsset.status === 'Replacement Requested' && oldAsset.status !== 'Replacement Requested') {
          toast.error(`🔔 New Replacement Request: ${newAsset.name || newAsset.model}`, {
            duration: 6000,
            style: { background: '#ffffff', color: '#0f172a', fontWeight: 'bold', border: '1px solid #ea580c' }
          });
          fetchData();
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(replacementChannel); 
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Pending Requests
      const { data: pendingAssets } = await supabase.from('assets').select('*').eq('status', 'Replacement Requested');
      const pendUserIds = [...new Set(pendingAssets?.map(a => a.assigned_to).filter(Boolean))];
      let pendProfiles: any[] = [];
      
      if (pendUserIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('id', pendUserIds);
        pendProfiles = profs || [];
      }
      
      // 🌟 UPDATED PENDING LOGIC: Detect Deactivated Users
      const compiledPending = (pendingAssets || []).map(asset => {
        const profile = pendProfiles.find(p => p.id === asset.assigned_to) || null;
        let staffName = profile?.full_name || profile?.name || '';
        let isRemoved = false;

        if (!staffName && asset.assigned_to) {
          staffName = 'Deactivated Staff';
          isRemoved = true;
        } else if (!staffName) {
          staffName = 'Unassigned';
        }

        return {
          ...asset, 
          user_profile: profile,
          display_name: staffName,
          is_removed: isRemoved
        };
      });
      setPendingRequests(compiledPending);

      // 2. Fetch Available Inventory (In Stock Unassigned)
      const { data: availableAssets } = await supabase.from('assets')
        .select('id, name, serial_number, asset_tag, category')
        .eq('status', 'In Stock (Unassigned)');
      setAvailableInventory(availableAssets || []);

      // 3. Fetch Processed History
      const { data: historyInsps } = await supabase.from('inspections')
        .select('*, assets(*)')
        .in('status', ['Replacement Approved', 'Replacement Rejected'])
        .order('created_at', { ascending: false });
        
      const histUserIds = [...new Set(historyInsps?.map(i => i.inspected_by).filter(Boolean))];
      let histProfiles: any[] = [];
      if (histUserIds.length > 0) {
        const { data: p } = await supabase.from('profiles').select('*').in('id', histUserIds);
        histProfiles = p || [];
      }
      
      // 🌟 UPDATED HISTORY LOGIC: Smart Detection of Admin actions vs Deleted Users
      const compiledHistory = (historyInsps || []).map(insp => {
        const profile = histProfiles.find(p => p.id === insp.inspected_by) || null;
        let staffName = profile?.full_name || profile?.name || '';
        let isRemoved = false;
        let isAdmin = false;

        if (!staffName) {
          if (insp.inspected_by) {
            staffName = 'Deactivated Staff';
            isRemoved = true;
          } else {
            staffName = 'System Administrator';
            isAdmin = true;
          }
        }

        return {
          ...insp, 
          user_profile: profile,
          display_name: staffName,
          is_removed: isRemoved,
          is_admin: isAdmin
        };
      });
      setHistoryRequests(compiledHistory);
      
    } catch (error: any) {
      console.error('Error syncing replacement records:', error);
      toast.error('Failed to sync replacement ledger.');
    } finally {
      setLoading(false);
    }
  };

  const sendStaffAlert = async (staffId: string, assetName: string, tagId: string) => {
    if (!staffId || staffId.includes('EMP-UNKNOWN')) {
      return alert("Cannot send alert: No valid employee profile ID attached to this record.");
    }

    setSendingAlertId(staffId);
    try {
      const message = `Please check with IT management regarding your hardware replacement request for ${assetName} (${tagId}). We are actively reviewing inventory.`;
      
      const { error } = await supabase.from('notifications').insert([{
        target_user: staffId,
        title: '🔔 Hardware Replacement Update',
        message: message,
        is_read: false,
        type: 'info'
      }]);

      if (error) throw error;
      toast.success(`✔ Active notification pushed directly to employee dashboard!`);
    } catch (err: any) {
      alert(`Error sending notification push: ${err.message}`);
    } finally {
      setSendingAlertId(null);
    }
  };

  const handleApproveSwap = async (oldAsset: any) => {
    if (!selectedReplacementId) return alert("Please select a new asset from the inventory to issue.");
    if (!window.confirm("Confirm hardware replacement swap?")) return;
    
    setProcessingId(oldAsset.id);
    const newAsset = availableInventory.find(a => a.id === selectedReplacementId);
    
    try {
      await supabase.from('assets').update({ 
        assigned_to: null, 
        status: 'In Stock (Unassigned)',
        inspection_status: 'Approved' 
      }).eq('id', oldAsset.id);

      await supabase.from('assets').update({ 
        assigned_to: oldAsset.assigned_to, 
        status: 'Assigned',
        inspection_status: 'Approved',
        last_inspection_date: new Date().toISOString()
      }).eq('id', selectedReplacementId);

      await supabase.from('inspections').insert([{
        asset_id: oldAsset.id, 
        inspected_by: oldAsset.assigned_to, 
        status: 'Replacement Approved', 
        notes: `[ADMIN SWAP] Faulty S/N: ${oldAsset.serial_number} replaced with New S/N: ${newAsset.serial_number}. Faulty unit returned to stock.`
      }]);

      if (oldAsset.assigned_to) {
        try {
          await supabase.from('notifications').insert([{
            target_user: oldAsset.assigned_to,
            title: '✔ Hardware Replacement Approved',
            message: `Your replacement request has been approved. Assigned: ${newAsset.name} (S/N: ${newAsset.serial_number}). Please handover your old unit.`,
            is_read: false,
            type: 'success'
          }]);
        } catch (notifErr) {}
      }

      setModal({ isOpen: false, data: null });
      setSelectedReplacementId('');
      toast.success('✔ Asset replaced successfully. Old device returned to stock.');
      fetchData(); 
    } catch (error: any) {
      toast.error(`Error processing swap: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReplacement = async (oldAsset: any) => {
    const reason = window.prompt("Enter administrative reason for denying replacement:");
    if (reason === null) return;
    
    setProcessingId(oldAsset.id);
    try {
      await supabase.from('assets').update({ status: 'Assigned' }).eq('id', oldAsset.id);
      
      await supabase.from('inspections').insert([{
        asset_id: oldAsset.id, 
        inspected_by: oldAsset.assigned_to, 
        status: 'Replacement Rejected', 
        notes: `Admin Denied Replacement: ${reason || 'No specific remarks provided.'}`
      }]);

      if (oldAsset.assigned_to) {
        try {
          await supabase.from('notifications').insert([{
            target_user: oldAsset.assigned_to, 
            title: '⚠️ Replacement Request Denied',
            message: `Your request to replace ${oldAsset.name} was not approved: ${reason || 'Please contact IT administration.'}`, 
            is_read: false,
            type: 'warning'
          }]);
        } catch (notifErr) {}
      }

      setModal({ isOpen: false, data: null });
      toast.success('Replacement request denied.');
      fetchData();
    } catch (error: any) {
      toast.error(`Error rejecting request: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const openSwapModal = (request: any) => {
    setModal({ isOpen: true, data: request });
    setSelectedReplacementId('');
  };

  const filteredPending = pendingRequests.filter(item => {
    const query = searchQuery.toLowerCase();
    const staffName = (item.display_name || '').toLowerCase();
    const empCode = (item.user_profile?.emp_code || '').toLowerCase();
    return staffName.includes(query) || empCode.includes(query) || (item.name || '').toLowerCase().includes(query) || (item.serial_number || '').toLowerCase().includes(query) || (item.asset_tag || '').toLowerCase().includes(query);
  });

  const filteredHistory = historyRequests.filter(item => {
    const query = searchQuery.toLowerCase();
    const staffName = (item.display_name || '').toLowerCase();
    const empCode = (item.user_profile?.emp_code || '').toLowerCase();
    return staffName.includes(query) || empCode.includes(query) || (item.assets?.name || '').toLowerCase().includes(query) || (item.assets?.serial_number || '').toLowerCase().includes(query);
  });

  // 🌟 COOL, MATTE FROSTED GLASS THEME
  const theme = {
    bg: 'bg-[#F1F5F9]',
    card: 'bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-sm', 
    cardHover: 'hover:bg-white/80 hover:border-orange-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300',
    modalBody: 'bg-[#F8FAFC]/95 backdrop-blur-2xl rounded-3xl border border-white shadow-xl',
    textMain: 'text-slate-800',
    textSub: 'text-slate-500',
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-12`}>
      <Toaster position="top-right" />
      
      {/* 🌟 SOFT, LOW-OPACITY ORBS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-225 h-125 pointer-events-none z-0 flex justify-between items-center opacity-30">
        <div className="w-112.5 h-112.5 bg-[#FFD1B3] rounded-full blur-[120px]"></div>
        <div className="w-112.5 h-112.5 bg-[#D8B4FE] rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-400 px-3 sm:px-6 lg:px-10 mx-auto space-y-5 sm:space-y-6 pt-4 relative z-10">
        
        {/* HEADER */}
        <div className={`${theme.card} p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <button 
              onClick={() => router.push('/admin')} 
              className={`p-2.5 sm:p-3 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm rounded-2xl text-slate-600 transition-all cursor-pointer`}
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <ArrowRightLeft className="text-orange-600 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>Hardware Replacements</span>
                </h1>
                {pendingRequests.length > 0 && (
                  <span className="px-3 py-0.5 bg-orange-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-sm">
                    {pendingRequests.length} Pending Swaps
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm font-semibold ${theme.textSub}`}>Process faulty device requests, assign new inventory to staff, and return old units to stock</p>
            </div>
          </div>

          <button 
            onClick={fetchData} 
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0`}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-orange-600' : 'text-purple-600'} />
            <span>Sync Records</span>
          </button>
        </div>

        {/* TABS & SEARCH */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'pending', label: `Pending Requests (${pendingRequests.length})`, icon: <Clock size={14} /> },
              { id: 'history', label: `Processed Swaps (${historyRequests.length})`, icon: <HistoryIcon size={14} /> }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className={`group flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest shrink-0 cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'bg-purple-600 text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] scale-[1.02]' 
                      : `bg-white/60 border border-slate-200 text-slate-700 hover:bg-white/90 shadow-sm`
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-purple-600 group-hover:text-purple-700 transition-colors'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* READABLE SEARCH BAR */}
          <div className="p-2.5 bg-white/80 border border-slate-200 text-slate-800 focus-within:bg-white focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/10 rounded-2xl transition-all shadow-sm flex items-center">
            <div className="relative w-full">
              <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400`} />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Employee Name, S/N, Asset Name, or Tag ID..." 
                className="w-full pl-12 pr-4 py-1.5 text-sm font-semibold outline-none bg-transparent placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* 🌟 REPLACEMENTS LISTING GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Fetching Hardware Handovers...</span>
          </div>
        ) : activeTab === 'pending' ? (
          /* PENDING REQUESTS TAB */
          filteredPending.length === 0 ? (
            <div className={`w-full py-24 text-center flex flex-col items-center justify-center space-y-3 ${theme.card}`}>
              <Monitor size={48} className="mx-auto text-orange-600 opacity-60" />
              <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Pending Replacement Requests</h3>
              <p className={`text-xs font-semibold ${theme.textSub}`}>All device swap requests have been processed or none have been requested.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPending.map((request, index) => {
                const staffName = request.display_name;
                const staffEmpCode = request.user_profile?.emp_code || request.user_profile?.emp_id || (request.is_removed ? 'REMOVED' : 'NO-ID');

                return (
                  <div 
                    key={`pending-${request.id}-${index}`} 
                    className={`p-6 md:p-8 flex flex-col justify-between gap-6 ${theme.card} ring-2 ring-orange-400/50 bg-white/70`}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-bold uppercase rounded-lg tracking-widest shadow-sm">
                          Swap Requested
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-sm">
                          {staffEmpCode}
                        </span>
                      </div>

                      <div>
                        <h3 className={`font-bold text-lg leading-tight ${theme.textMain}`}>{request.name || request.model}</h3>
                        <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>{request.brand || 'Standard Brand'} ({request.category || 'Hardware'})</p>
                      </div>

                      <div className={`p-4 bg-white/60 border border-slate-200 rounded-2xl space-y-2.5 shadow-sm`}>
                        <div className="flex justify-between items-center text-xs">
                          <span className={`font-semibold uppercase tracking-widest ${theme.textSub}`}>Tag ID:</span>
                          <span className={`font-mono font-bold ${theme.textMain}`}>{request.asset_tag}</span>
                        </div>
                        <div className={`flex justify-between items-center text-xs border-t border-slate-200 pt-2`}>
                          <span className={`font-semibold uppercase tracking-widest ${theme.textSub}`}>Faulty S/N:</span>
                          <span className={`font-mono font-bold ${theme.textMain}`}>{request.serial_number}</span>
                        </div>
                      </div>

                      <div className={`p-4 bg-white/60 border border-slate-200 rounded-2xl flex items-center gap-3 shadow-sm`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white text-orange-600 shadow-sm border border-slate-200`}>
                          <User size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <span className={`text-[9px] font-bold uppercase tracking-widest block ${theme.textSub}`}>Requested By</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {request.is_removed && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-widest">Deactivated</span>
                            )}
                            <p className={`text-sm font-bold truncate ${theme.textMain}`}>{staffName}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-200 mt-auto">
                      <button 
                        onClick={() => openSwapModal(request)} 
                        className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(249,115,22,0.3)] transition-all cursor-pointer"
                      >
                        <ArrowRightLeft size={16} /> Process Swap & Assign New
                      </button>

                      <button
                        type="button"
                        disabled={sendingAlertId === request.assigned_to || request.is_removed}
                        onClick={() => sendStaffAlert(request.assigned_to, request.name, request.asset_tag)}
                        className={`w-full py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50`}
                      >
                        <Send size={13} className={sendingAlertId === request.assigned_to ? 'animate-bounce text-orange-600' : 'text-orange-600'} />
                        <span>{sendingAlertId === request.assigned_to ? 'Pushing Alert...' : '⚡ Send Update Ping to Staff'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* PROCESSED HISTORY TAB */
          filteredHistory.length === 0 ? (
            <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm ${theme.card}`}>
              <HistoryIcon size={48} className="mx-auto text-purple-600 opacity-60" />
              <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Historical Swaps Found</h3>
              <p className={`text-xs font-semibold ${theme.textSub}`}>No processed replacement records match your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredHistory.map((record, index) => {
                const staffName = record.display_name;
                const isApproved = record.status === 'Replacement Approved';
                const processDate = record.created_at ? new Date(record.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';

                return (
                  <div 
                    key={`history-${record.id}-${index}`} 
                    className={`p-6 md:p-8 flex flex-col justify-between gap-6 transition-all duration-300 ${theme.card} ${theme.cardHover}`}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg tracking-wider flex items-center gap-1.5 border shadow-sm ${
                          isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isApproved ? <CheckCircle2 size={12}/> : <XCircle size={12}/>} {isApproved ? 'Swap Approved & Restocked' : 'Swap Rejected'}
                        </span>
                        <span className={`text-[10px] font-bold ${theme.textSub}`}>{processDate}</span>
                      </div>
                      
                      <div>
                        <h3 className={`font-bold text-base leading-tight ${theme.textMain}`}>{record.assets?.name || 'Hardware Device'}</h3>
                        <p className={`text-xs font-mono mt-1 ${theme.textSub}`}>Faulty S/N: {record.assets?.serial_number || 'N/A'}</p>
                      </div>
                      
                      <div className={`p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner text-slate-800`}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-purple-700">Execution Audit Log</p>
                        <p className="text-xs font-semibold leading-relaxed">"{record.notes}"</p>
                      </div>
                    </div>

                    <div className={`pt-4 border-t border-slate-200 flex items-center justify-between text-xs mt-auto`}>
                      <div className={`flex items-center gap-1.5 ${theme.textSub}`}>
                        <User size={14} className="text-purple-600" />
                        <span>{record.is_admin ? 'Executed by:' : 'Requested by:'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.is_removed && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-100 border border-rose-200 text-rose-700 uppercase tracking-widest shadow-sm">Removed</span>
                        )}
                        {record.is_admin && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-100 border border-purple-200 text-purple-700 uppercase tracking-widest shadow-sm">IT Admin</span>
                        )}
                        <strong className={theme.textMain}>{staffName}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

      </div>

      {/* 🚀 PROCESSING SWAP MODAL */}
      {modal.isOpen && modal.data && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-9999 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-2xl flex flex-col max-h-[90vh] ${theme.modalBody}`}>
            
            <div className="p-6 border-b border-white/60 flex items-center justify-between shrink-0 bg-white/50">
              <h3 className={`font-bold text-base tracking-tight uppercase flex items-center gap-2.5 ${theme.textMain}`}>
                <ArrowRightLeft size={18} className="text-orange-600"/> Execute Hardware Replacement Swap
              </h3>
              <button onClick={() => setModal({ isOpen: false, data: null })} className="p-2 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm rounded-xl cursor-pointer transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              
              {/* Target Faulty Asset Box */}
              <div className="p-5 border-2 border-dashed border-orange-300 bg-orange-50/50 rounded-3xl relative">
                <div className="absolute -top-3 left-4 px-2 text-[10px] font-bold uppercase tracking-widest rounded-md bg-white border border-orange-200 text-orange-600 shadow-sm">
                  Step 1: Faulty Asset (Returns to Stock)
                </div>
                <h4 className={`font-bold text-base mt-1 ${theme.textMain}`}>{modal.data.name}</h4>
                <div className={`flex flex-wrap gap-4 mt-2 text-xs font-mono font-bold ${theme.textSub}`}>
                  <span>S/N: {modal.data.serial_number}</span>
                  <span>Tag: {modal.data.asset_tag}</span>
                </div>
                <p className={`text-xs font-semibold mt-3 border-t border-orange-200 pt-3 flex items-center justify-between`}>
                  <span className={theme.textSub}>Currently Assigned To:</span>
                  <strong className={theme.textMain}>{modal.data.user_profile?.full_name || 'Unknown User'}</strong>
                </p>
              </div>

              <div className="flex justify-center text-orange-600">
                <ArrowRightLeft size={24} className="animate-pulse" />
              </div>

              {/* Select New Replacement from Inventory */}
              <div className="p-5 border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-3xl relative">
                <div className="absolute -top-3 left-4 px-2 text-[10px] font-bold uppercase tracking-widest rounded-md bg-white border border-purple-200 text-purple-700 shadow-sm">
                  Step 2: Select New Replacement (From Stock)
                </div>
                
                <div className="mt-2">
                  <label className={`text-xs font-bold uppercase mb-2 block ${theme.textSub}`}>Available Inventory ({availableInventory.length} Units In Stock)</label>
                  <select 
                    value={selectedReplacementId} 
                    onChange={(e) => setSelectedReplacementId(e.target.value)}
                    className="w-full p-4 bg-white border border-slate-300 text-slate-900 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl text-xs sm:text-sm font-semibold outline-none transition-all shadow-sm cursor-pointer"
                  >
                    <option value="">-- Choose a replacement device to issue --</option>
                    {availableInventory
                      .sort((a, b) => a.category === modal.data.category ? -1 : 1)
                      .map(asset => (
                        <option key={asset.id} value={asset.id}>
                          ⚡ {asset.name} (S/N: {asset.serial_number}) - {asset.category}
                        </option>
                    ))}
                  </select>
                  {availableInventory.length === 0 && (
                    <p className="text-xs text-rose-500 mt-2 font-bold flex items-center gap-1"><AlertTriangle size={14}/> No unassigned hardware found in warehouse stock.</p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-xs font-semibold leading-relaxed text-amber-800 shadow-sm">
                <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <p>Approving this swap will instantly unassign the faulty asset and **return it to stock** (`In Stock (Unassigned)`), while assigning the selected new device to the staff member with an active notification.</p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t border-white/60 flex flex-col sm:flex-row justify-between gap-4 shrink-0 bg-white/50">
              <button 
                onClick={() => handleRejectReplacement(modal.data)} 
                className="px-6 py-3.5 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all"
              >
                ❌ Reject Swap Request
              </button>
              <button 
                disabled={!selectedReplacementId || processingId === modal.data.id} 
                onClick={() => handleApproveSwap(modal.data)} 
                className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === modal.data.id ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                Confirm & Assign Replacement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReplacementsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center gap-4 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-orange-600"></div>
        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-600">Loading Replacement Ledger...</span>
      </div>
    }>
      <AdminReplacementsContent />
    </Suspense>
  );
}