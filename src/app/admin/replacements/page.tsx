'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ArrowLeft, ArrowRightLeft, CheckCircle2, XCircle, Clock, 
  Eye, Laptop, User, Calendar, ShieldAlert, Search, RefreshCw, 
  X, History, FilterX, ExternalLink, Settings, Send, 
  ShieldCheck, Check, AlertTriangle, Package, Monitor, ArrowRight
} from 'lucide-react';

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
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 🌟 REAL-TIME GLOBAL THEME LISTENER
  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('vsit_theme');
      const isDark = savedTheme === 'dark' || document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    checkTheme();
    window.addEventListener('storage', checkTheme);
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

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
            style: { background: isDarkMode ? '#150f24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', fontWeight: 'bold', border: '1px solid #ea580c' }
          });
          fetchData();
        }
      })
      .subscribe();

    return () => { 
      window.removeEventListener('storage', checkTheme);
      observer.disconnect();
      supabase.removeChannel(replacementChannel); 
    };
  }, [isDarkMode]);

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
      const compiledPending = (pendingAssets || []).map(asset => ({
        ...asset, 
        user_profile: pendProfiles.find(p => p.id === asset.assigned_to) || null
      }));
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
      const compiledHistory = (historyInsps || []).map(insp => ({
        ...insp, 
        user_profile: histProfiles.find(p => p.id === insp.inspected_by) || null
      }));
      setHistoryRequests(compiledHistory);
    } catch (error: any) {
      console.error('Error syncing replacement records:', error);
      toast.error('Failed to sync replacement ledger.');
    } finally {
      setLoading(false);
    }
  };

  // 🌟 ONE-CLICK DIRECT STAFF NOTIFICATION & MESSAGE PING
  const sendStaffAlert = async (staffId: string, assetName: string, tagId: string) => {
    if (!staffId) return alert("Cannot send alert: No valid employee profile ID attached to this record.");

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

  // 🌟 EXECUTE SWAP (OLD ASSET RETURNS TO STOCK, NEW ASSET ASSIGNED TO STAFF)
  const handleApproveSwap = async (oldAsset: any) => {
    if (!selectedReplacementId) return alert("Please select a new asset from the inventory to issue.");
    if (!window.confirm("Confirm hardware replacement swap?")) return;
    
    setProcessingId(oldAsset.id);
    const newAsset = availableInventory.find(a => a.id === selectedReplacementId);
    
    try {
      // 1. Unassign old asset & return to stock as requested
      await supabase.from('assets').update({ 
        assigned_to: null, 
        status: 'In Stock (Unassigned)',
        inspection_status: 'Approved' 
      }).eq('id', oldAsset.id);

      // 2. Assign new asset from inventory to employee
      await supabase.from('assets').update({ 
        assigned_to: oldAsset.assigned_to, 
        status: 'Assigned',
        inspection_status: 'Approved',
        last_inspection_date: new Date().toISOString()
      }).eq('id', selectedReplacementId);

      // 3. Record audit trail in inspections ledger
      await supabase.from('inspections').insert([{
        asset_id: oldAsset.id, 
        inspected_by: oldAsset.assigned_to, 
        status: 'Replacement Approved', 
        notes: `[ADMIN SWAP] Faulty S/N: ${oldAsset.serial_number} replaced with New S/N: ${newAsset.serial_number}. Faulty unit returned to stock.`
      }]);

      // 4. Push schema-immune notification to staff dashboard
      if (oldAsset.assigned_to) {
        try {
          await supabase.from('notifications').insert([{
            target_user: oldAsset.assigned_to,
            title: '✔ Hardware Replacement Approved',
            message: `Your replacement request has been approved. Assigned: ${newAsset.name} (S/N: ${newAsset.serial_number}). Please handover your old unit.`,
            is_read: false,
            type: 'success'
          }]);
        } catch (notifErr) {
          console.warn("Non-fatal notification error:", notifErr);
        }
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

  // 🌟 REJECT REPLACEMENT REQUEST
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
        } catch (notifErr) {
          console.warn("Non-fatal notification error:", notifErr);
        }
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
    const staffName = (item.user_profile?.full_name || item.user_profile?.name || '').toLowerCase();
    const empCode = (item.user_profile?.emp_code || '').toLowerCase();
    return staffName.includes(query) || empCode.includes(query) || (item.name || '').toLowerCase().includes(query) || (item.serial_number || '').toLowerCase().includes(query) || (item.asset_tag || '').toLowerCase().includes(query);
  });

  const filteredHistory = historyRequests.filter(item => {
    const query = searchQuery.toLowerCase();
    const staffName = (item.user_profile?.full_name || item.user_profile?.name || '').toLowerCase();
    const empCode = (item.user_profile?.emp_code || '').toLowerCase();
    return staffName.includes(query) || empCode.includes(query) || (item.assets?.name || '').toLowerCase().includes(query) || (item.assets?.serial_number || '').toLowerCase().includes(query);
  });

  const theme = {
    bg: isDarkMode ? 'bg-[#0b0712]' : 'bg-slate-50',
    card: isDarkMode ? 'bg-[#150f24] border-purple-900/40' : 'bg-white border-slate-200/80',
    textMain: isDarkMode ? 'text-purple-50' : 'text-slate-900',
    textSub: isDarkMode ? 'text-purple-300/70' : 'text-slate-500', 
    cardHover: isDarkMode ? 'hover:border-orange-500/60 hover:bg-[#1c1430]' : 'hover:border-orange-400 hover:shadow-lg hover:-translate-y-1',
    iconBgPrimary: isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50 text-orange-600',
    iconBgPurple: isDarkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-50 text-purple-700',
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-12`}>
      <Toaster position="top-right" />
      
      {/* 🌟 FULL-SCREEN ENTERPRISE FLUID WRAPPER */}
      <div className="w-full max-w-400 px-3 sm:px-6 lg:px-10 mx-auto space-y-5 sm:space-y-6 pt-4">
        
        {/* 🌟 DYNAMIC HEADER (WITH BACK ARROW IN FRONT OF ICON & NO EXTRA RIGHT BUTTON) */}
        <div className={`${theme.card} rounded-3xl p-4 sm:p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 transition-all duration-300`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            {/* Back Arrow directly to the left of the title block */}
            <button 
              onClick={() => router.push('/admin')} 
              className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${theme.card} hover:border-orange-500 hover:text-orange-600 ${theme.textSub}`}
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <ArrowRightLeft className="text-orange-600 dark:text-orange-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>Hardware Replacements</span>
                </h1>
                {pendingRequests.length > 0 && (
                  <span className="px-3 py-0.5 bg-linear-to-r from-orange-500 to-amber-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-md shadow-orange-500/20">
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
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-50 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 ${theme.card} ${theme.textMain} shrink-0`}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-orange-600' : 'text-purple-600 dark:text-purple-400'} />
            <span>Sync Records</span>
          </button>
        </div>

        {/* 🌟 BRAND COLOR NAVIGATION TABS & ADAPTIVE SEARCH BAR */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'pending', label: `Pending Requests (${pendingRequests.length})`, icon: <Clock size={14} /> },
              { id: 'history', label: `Processed Swaps (${historyRequests.length})`, icon: <History size={14} /> }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className={`group flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest shrink-0 cursor-pointer transition-all duration-200 border ${
                    isActive 
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25 border-orange-600 scale-[1.02]' 
                      : `${theme.card} ${theme.textSub} hover:text-purple-600 hover:border-purple-300 dark:hover:text-purple-300 dark:hover:border-purple-700`
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-purple-500 dark:text-purple-400 group-hover:text-orange-500 transition-colors'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 100% Adaptive Search Bar (No White Box Glitch in Dark Mode) */}
          <div 
            style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', borderColor: isDarkMode ? '#581c87' : '#e2e8f0' }}
            className="p-2.5 rounded-2xl border shadow-sm flex items-center transition-all duration-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-orange-300"
          >
            <div className="relative w-full">
              <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Employee Name, S/N, Asset Name, or Tag ID..." 
                style={{ backgroundColor: 'transparent', color: isDarkMode ? '#f3e8ff' : '#0f172a', colorScheme: isDarkMode ? 'dark' : 'light' }}
                className="w-full pl-12 pr-4 py-3 rounded-xl text-xs sm:text-sm font-semibold outline-none transition-all bg-transparent border-0 shadow-none"
              />
            </div>
          </div>
        </div>

        {/* 🌟 REPLACEMENTS LISTING GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${isDarkMode ? 'border-orange-400' : 'border-orange-600'}`}></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Fetching Hardware Replacements...</span>
          </div>
        ) : activeTab === 'pending' ? (
          /* PENDING REQUESTS TAB */
          filteredPending.length === 0 ? (
            <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm ${theme.card}`}>
              <Monitor size={48} className={`mx-auto ${isDarkMode ? 'text-zinc-700' : 'text-purple-200'}`} />
              <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Pending Replacement Requests</h3>
              <p className={`text-xs font-semibold ${theme.textSub}`}>All device swap requests have been processed or none have been requested.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPending.map((request, index) => {
                const staffName = request.user_profile?.full_name || request.user_profile?.name || 'Unassigned Staff';
                const staffEmpCode = request.user_profile?.emp_code || request.user_profile?.emp_id || 'NO-ID';

                return (
                  <div 
                    key={`pending-${request.id}-${index}`} 
                    className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-all flex flex-col justify-between gap-6 duration-300 ${theme.card} ${
                      isDarkMode ? 'border-orange-500/50 shadow-orange-600/10' : 'border-orange-300 shadow-orange-600/5'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase rounded-full tracking-widest shadow-2xs">
                          Swap Requested
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${
                          isDarkMode ? 'bg-[#18181b] text-zinc-300 border-purple-800/50' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {staffEmpCode}
                        </span>
                      </div>

                      <div>
                        <h3 className={`font-bold text-lg leading-tight ${theme.textMain}`}>{request.name || request.model}</h3>
                        <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>{request.brand || 'Standard Brand'} ({request.category || 'Hardware'})</p>
                      </div>

                      <div className={`p-4 rounded-2xl border space-y-2.5 shadow-2xs ${isDarkMode ? 'bg-[#0f0a1c]/80 border-purple-900/50' : 'bg-slate-50/80 border-slate-200'}`}>
                        <div className="flex justify-between items-center text-xs">
                          <span className={`font-semibold uppercase tracking-widest ${theme.textSub}`}>Tag ID:</span>
                          <span className={`font-mono font-bold ${theme.textMain}`}>{request.asset_tag}</span>
                        </div>
                        <div className={`flex justify-between items-center text-xs border-t pt-2 ${isDarkMode ? 'border-purple-900/40' : 'border-slate-200/60'}`}>
                          <span className={`font-semibold uppercase tracking-widest ${theme.textSub}`}>Faulty S/N:</span>
                          <span className={`font-mono font-bold ${theme.textMain}`}>{request.serial_number}</span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isDarkMode ? 'bg-purple-950/40 border-purple-800/50' : 'bg-purple-50/70 border-purple-100'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${theme.iconBgPrimary}`}>
                          <User size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <span className={`text-[9px] font-bold uppercase tracking-widest block ${theme.textSub}`}>Requested By</span>
                          <p className={`text-sm font-bold truncate ${theme.textMain}`}>{staffName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-purple-900/40 mt-auto">
                      <button 
                        onClick={() => openSwapModal(request)} 
                        className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <ArrowRightLeft size={16} /> Process Swap & Assign New
                      </button>

                      <button
                        type="button"
                        disabled={sendingAlertId === request.assigned_to}
                        onClick={() => sendStaffAlert(request.assigned_to, request.name, request.asset_tag)}
                        className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                          isDarkMode ? 'bg-purple-900/50 hover:bg-purple-800/60 text-purple-200 border border-purple-800' : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200'
                        }`}
                      >
                        <Send size={13} className={sendingAlertId === request.assigned_to ? 'animate-bounce' : ''} />
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
              <History size={48} className={`mx-auto ${isDarkMode ? 'text-zinc-700' : 'text-purple-200'}`} />
              <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Historical Swaps Found</h3>
              <p className={`text-xs font-semibold ${theme.textSub}`}>No processed replacement records match your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredHistory.map((record, index) => {
                const staffName = record.user_profile?.full_name || record.user_profile?.name || 'Unknown User';
                const isApproved = record.status === 'Replacement Approved';
                const processDate = record.created_at ? new Date(record.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';

                return (
                  <div 
                    key={`history-${record.id}-${index}`} 
                    className={`p-6 md:p-8 rounded-3xl border shadow-sm flex flex-col justify-between gap-6 transition-all duration-300 ${theme.card} ${theme.cardHover}`}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-widest flex items-center gap-1.5 border shadow-2xs ${
                          isApproved ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200') : (isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200')
                        }`}>
                          {isApproved ? <CheckCircle2 size={12}/> : <XCircle size={12}/>} {isApproved ? 'Swap Approved & Restocked' : 'Swap Rejected'}
                        </span>
                        <span className={`text-[10px] font-bold ${theme.textSub}`}>{processDate}</span>
                      </div>
                      
                      <div>
                        <h3 className={`font-bold text-base leading-tight ${theme.textMain}`}>{record.assets?.name || 'Hardware Device'}</h3>
                        <p className={`text-xs font-mono mt-1 ${theme.textSub}`}>Faulty S/N: {record.assets?.serial_number || 'N/A'}</p>
                      </div>
                      
                      <div className={`p-4 rounded-2xl border shadow-inner ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50 text-purple-100' : 'bg-slate-50 border-slate-200/80 text-slate-800'}`}>
                        <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-orange-400' : 'text-purple-800'}`}>Execution Audit Log</p>
                        <p className="text-xs font-medium leading-relaxed">"{record.notes}"</p>
                      </div>
                    </div>

                    <div className={`pt-4 border-t flex items-center justify-between text-xs mt-auto ${isDarkMode ? 'border-purple-900/40' : 'border-slate-100'}`}>
                      <div className={`flex items-center gap-1.5 ${theme.textSub}`}>
                        <User size={14} className="text-purple-600 dark:text-purple-400" />
                        <span>Requested by:</span>
                      </div>
                      <strong className={theme.textMain}>{staffName}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

      </div>

      {/* 🚀 PROCESSING SWAP MODAL (100% ADAPTIVE FOR LIGHT & DARK MODE) */}
      {modal.isOpen && modal.data && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-9999 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 ${theme.card}`}>
            
            {/* Modal Header */}
            <div className={`p-6 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-purple-50/70 border-purple-100'}`}>
              <h3 className={`font-black text-base tracking-tight uppercase flex items-center gap-2.5 ${theme.textMain}`}>
                <ArrowRightLeft size={18} className="text-orange-600 dark:text-orange-400"/> Execute Hardware Replacement Swap
              </h3>
              <button onClick={() => setModal({ isOpen: false, data: null })} className={`p-2 rounded-full cursor-pointer transition-colors border ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}><X size={18}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              
              {/* Target Faulty Asset Box */}
              <div className={`p-5 border-2 border-dashed rounded-2xl relative ${isDarkMode ? 'border-orange-500/40 bg-orange-500/10' : 'border-orange-300 bg-orange-50/50'}`}>
                <div className={`absolute -top-3 left-4 px-2 text-[10px] font-black uppercase tracking-widest rounded border ${isDarkMode ? 'bg-[#150f24] text-orange-400 border-orange-500/40' : 'bg-white text-orange-600 border-orange-200'}`}>
                  Step 1: Faulty Asset (Returns to Stock)
                </div>
                <h4 className={`font-bold text-base mt-1 ${theme.textMain}`}>{modal.data.name}</h4>
                <div className={`flex flex-wrap gap-4 mt-2 text-xs font-mono font-bold ${theme.textSub}`}>
                  <span>S/N: {modal.data.serial_number}</span>
                  <span>Tag: {modal.data.asset_tag}</span>
                </div>
                <p className={`text-xs font-semibold mt-3 border-t pt-3 flex items-center justify-between ${isDarkMode ? 'border-orange-500/20' : 'border-orange-200'}`}>
                  <span>Currently Assigned To:</span>
                  <strong className={theme.textMain}>{modal.data.user_profile?.full_name || 'Unknown User'}</strong>
                </p>
              </div>

              <div className="flex justify-center text-orange-600 dark:text-orange-400">
                <ArrowRightLeft size={24} className="animate-pulse" />
              </div>

              {/* Select New Replacement from Inventory */}
              <div className={`p-5 border-2 border-dashed rounded-2xl relative ${isDarkMode ? 'border-purple-500/40 bg-purple-500/10' : 'border-purple-300 bg-purple-50/50'}`}>
                <div className={`absolute -top-3 left-4 px-2 text-[10px] font-black uppercase tracking-widest rounded border ${isDarkMode ? 'bg-[#150f24] text-purple-300 border-purple-500/40' : 'bg-white text-purple-700 border-purple-200'}`}>
                  Step 2: Select New Replacement (From Stock)
                </div>
                
                <div className="mt-2">
                  <label className={`text-xs font-bold uppercase mb-2 block ${theme.textSub}`}>Available Inventory ({availableInventory.length} Units In Stock)</label>
                  <select 
                    style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', borderColor: isDarkMode ? '#581c87' : '#cbd5e1' }}
                    value={selectedReplacementId} 
                    onChange={(e) => setSelectedReplacementId(e.target.value)}
                    className="w-full p-4 rounded-xl border outline-none focus:ring-2 focus:ring-orange-500/20 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <option value="" style={{ backgroundColor: isDarkMode ? '#150f24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>-- Choose a replacement device to issue --</option>
                    {availableInventory
                      .sort((a, b) => a.category === modal.data.category ? -1 : 1)
                      .map(asset => (
                        <option key={asset.id} value={asset.id} style={{ backgroundColor: isDarkMode ? '#181130' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>
                          ⚡ {asset.name} (S/N: {asset.serial_number}) - {asset.category}
                        </option>
                    ))}
                  </select>
                  {availableInventory.length === 0 && (
                    <p className="text-xs text-rose-500 mt-2 font-bold flex items-center gap-1"><AlertTriangle size={14}/> No unassigned hardware found in warehouse stock.</p>
                  )}
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex gap-3 text-xs font-medium leading-relaxed ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <p>Approving this swap will instantly unassign the faulty asset and **return it to stock** (`In Stock (Unassigned)`), while assigning the selected new device to the staff member with an active notification.</p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className={`p-6 border-t flex flex-col sm:flex-row justify-between gap-3 shrink-0 ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-slate-50 border-slate-200'}`}>
              <button 
                onClick={() => handleRejectReplacement(modal.data)} 
                className="px-6 py-3.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
              >
                ❌ Reject Swap Request
              </button>
              <button 
                disabled={!selectedReplacementId || processingId === modal.data.id} 
                onClick={() => handleApproveSwap(modal.data)} 
                className="px-8 py-3.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0712] flex flex-col items-center justify-center gap-4 text-slate-400 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-orange-600 dark:border-t-orange-500"></div>
        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-purple-300">Loading Replacement Ledger...</span>
      </div>
    }>
      <AdminReplacementsContent />
    </Suspense>
  );
}